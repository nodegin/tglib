const { crc32 } = require('crc')
const ffi = require('ffi-napi')
const ref = require('ref-napi')
const fs = require('fs-extra')
const path = require('path')

const TG = require('./TG')
const { version: appVersion } = require('./package.json')
const { buildQuery, getInput, emptyFunction } = require('./utils')
const {
  InvalidCallbackKeyError,
  InvalidBotTokenError,
  ClientCreateError,
  ClientNotCreatedError,
  ClientFetchError,
} = require('./Errors')

class Client {
  constructor(options = {}) {
    const defaultOptions = {
      apiId: null,
      apiHash: null,
      auth: {},
      binaryPath: 'libtdjson',
      verbosityLevel: 2,
      tdlibParameters: {
        'enable_storage_optimizer': true,
        'use_message_database': true,
        'use_secret_chats': true,
        'system_language_code': 'en',
        'application_version': '1.0',
        'device_model': 'tglib',
        'system_version': appVersion,
      },
    }
    this.options = {
      ...defaultOptions,
      ...options,
    }
    this.ready = new Promise((resolve, reject) => {
      // Add some delay to allow telegram get ready. (Issue #20)
      this.resolver = () => setTimeout(resolve, 500)
      this.rejector = reject
    })
    this.client = null
    this.tg = null
    this.fetching = {}
    this.callbacks = {
      'td:update': emptyFunction,
      'td:error': emptyFunction,
      'td:getInput'({ type, string, extras: { hint } = {} }) {
        return getInput(type, `${string}${ hint ? ` (${hint})` : '' }`)
      },
    }
    this.init()
  }

  async init() {
    try {
      const {
        auth: { type, value },
        binaryPath,
        verbosityLevel,
      } = this.options

      this.appDir = path.resolve(process.cwd(), '__tglib__', crc32(`${type}${value}`).toString())
      await fs.ensureDir(this.appDir)

      this.tdlib = ffi.Library(
        path.resolve(process.cwd(), binaryPath),
        {
          'td_json_client_create'          : ['pointer', []],
          'td_json_client_send'            : ['void'   , ['pointer', 'string']],
          'td_json_client_receive'         : ['string' , ['pointer', 'double']],
          'td_json_client_execute'         : ['string' , ['pointer', 'string']],
          'td_json_client_destroy'         : ['void'   , ['pointer']],
          'td_set_log_file_path'           : ['int'    , ['string']],
          'td_set_log_verbosity_level'     : ['void'   , ['int']],
          'td_set_log_fatal_error_callback': ['void'   , ['pointer']],
        }
      )
      this.tdlib.td_set_log_file_path(path.resolve(this.appDir, 'logs.txt'))
      this.tdlib.td_set_log_verbosity_level(verbosityLevel)
      this.tdlib.td_set_log_fatal_error_callback(ffi.Callback('void', ['string'], (message) => {
        console.error('TDLib Fatal Error:', message)
      }))

      this.client = await this._create()
      this.tg = new TG(this)
    } catch (error) {
      this.rejector(new ClientCreateError(error))
      return
    }
    this.loop()
  }

  registerCallback(key, callback) {
    const validNames = Object.keys(this.callbacks)
    if (validNames.indexOf(key) < 0) {
      throw new InvalidCallbackError(key)
    }
    if (key === 'td:getInput') {
      const result = callback({}) || {}
      if (typeof result.then !== 'function') {
        throw new InvalidCallbackError(key)
      }
    }
    this.callbacks[key] = callback
  }

  async loop() {
    const update = await this._receive()
    if (update) {
      switch (update['@type']) {
        case 'updateAuthorizationState': {
          await this.handleAuth(update)
          break
        }
        case 'error': {
          await this.handleError(update)
          break
        }
        default:
          await this.handleUpdate(update)
          break
      }
    }
    this.loop()
  }

  async handleAuth(update) {
    const { auth: { type, value } } = this.options
    switch (update['authorization_state']['@type']) {
      case 'authorizationStateWaitTdlibParameters': {
        this._send({
          '@type': 'setTdlibParameters',
          'parameters': {
            ...this.options.tdlibParameters,
            '@type': 'tdlibParameters',
            'database_directory': path.resolve(this.appDir, 'database'),
            'files_directory': path.resolve(this.appDir, 'files'),
            'api_id': this.options.apiId,
            'api_hash': this.options.apiHash,
          },
        })
        break
      }
      case 'authorizationStateWaitEncryptionKey': {
        this._send({ '@type': 'checkDatabaseEncryptionKey' })
        break
      }
      case 'authorizationStateWaitPhoneNumber': {
        console.log(`Authorizing ${type} (${value})`)
        if (type === 'user') {
          this._send({
            '@type': 'setAuthenticationPhoneNumber',
            'phone_number': value,
          })
        } else {
          this._send({
            '@type': 'checkAuthenticationBotToken',
            'token': value,
          })
        }
        break
      }
      case 'authorizationStateWaitCode': {
        const payload = { '@type': 'checkAuthenticationCode' }
        if (!update['authorization_state']['is_registered']) {
          console.log(`User ${value} has not yet been registered with Telegram`)
          payload['first_name'] = await this.callbacks['td:getInput']({
            type: 'input',
            string: 'AuthorizationFirstNameInput',
          })
        }
        payload['code'] = await this.callbacks['td:getInput']({
          type: 'input',
          string: 'AuthorizationAuthCodeInput',
        })
        this._send(payload)
        break
      }
      case 'authorizationStateWaitPassword': {
        this.authFlowPasswordHint = update['authorization_state']['password_hint']
        const password = await this.callbacks['td:getInput']({
          type: 'password',
          string: 'AuthorizationPasswordInput',
          extras: { hint: this.authFlowPasswordHint },
        })
        this._send({
          '@type': 'checkAuthenticationPassword',
          'password': password,
        })
        break
      }
      case 'authorizationStateReady':
        delete this.authFlowPasswordHint
        this.resolver()
        break
    }
  }

  async handleError(update) {
    const id = update['@extra']
    if (this.fetching[id]) {
      delete update['@extra']
      this.fetching[id].reject(new ClientFetchError(update))
      delete this.fetching[id]
      return
    }
    switch (update['message']) {
      case 'PHONE_CODE_EMPTY':
      case 'PHONE_CODE_INVALID': {
        const code = await this.callbacks['td:getInput']({
          type: 'input',
          string: 'AuthorizationAuthCodeReInput',
        })
        this._send({
          '@type': 'checkAuthenticationCode',
          'code': code,
        })
        break
      }
      case 'PASSWORD_HASH_INVALID': {
        const password = await this.callbacks['td:getInput']({
          type: 'password',
          string: 'AuthorizationPasswordReInput',
          extras: { hint: this.authFlowPasswordHint },
        })
        this._send({
          '@type': 'checkAuthenticationPassword',
          'password': password,
        })
        break
      }
      case 'ACCESS_TOKEN_INVALID': {
        this.rejector(new InvalidBotTokenError(this.options.auth.value))
        break
      }
      default: {
        this.callbacks['td:error'].call(null, update)
      }
    }
  }

  async handleUpdate(update) {
    const id = update['@extra']
    if (this.fetching[id]) {
      delete update['@extra']
      this.fetching[id].resolve(update)
      delete this.fetching[id]
      return
    }
    switch (update['@type']) {
      case 'updateOption': {
        if (update['name'] === 'my_id' && update['value']['@type'] === 'optionValueEmpty') {
          // session has been signed out
          await this._destroy()
          break
        }
      }
      default: {
        this.callbacks['td:update'].call(null, update)
      }
    }
  }

  async fetch(query) {
    const id = crc32(Math.random().toString()).toString()
    query['@extra'] = id
    const receiveUpdate = new Promise((resolve, reject) => {
      this.fetching[id] = { resolve, reject }
      // timeout after 15 seconds
      setTimeout(() => {
        delete this.fetching[id]
        reject('Query timed out after 15 seconds.')
      }, 1000 * 15)
    })
    await this._send(query)
    return receiveUpdate
  }

  _create() {
    return new Promise((resolve, reject) => {
      this.tdlib.td_json_client_create.async((err, client) => {
        if (err) {
          return reject(err)
        }
        resolve(client)
      })
    })
  }

  _send(query) {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        return reject(new ClientNotCreatedError())
      }
      this.tdlib.td_json_client_send.async(this.client, buildQuery(query), (err, response) => {
        if (err) {
          return reject(err)
        }
        if (!response) {
          return resolve(null)
        }
        resolve(JSON.parse(response))
      })
    })
  }

  _receive(timeout = 10) {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        return reject(new ClientNotCreatedError())
      }
      this.tdlib.td_json_client_receive.async(this.client, timeout, (err, response) => {
        if (err) {
          return reject(err)
        }
        if (!response) {
          return resolve(null)
        }
        resolve(JSON.parse(response))
      })
    })
  }

  _execute(query) {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        return reject(new ClientNotCreatedError())
      }
      try {
        const response = this.tdlib.td_json_client_execute(this.client, buildQuery(query))
        if (!response) {
          return resolve(null)
        }
        resolve(JSON.parse(response))
      } catch (err) {
        reject(err)
      }
    })
  }

  _destroy() {
    return new Promise((resolve) => {
      if (this.client) {
        this.tdlib.td_json_client_destroy(this.client)
        this.client = null
      }
      resolve()
    })
  }
}

module.exports = Client
