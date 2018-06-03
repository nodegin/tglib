const uuidv4 = require('uuid/v4')
const ffi = require('ffi-napi')
const ref = require('ref-napi')
const path = require('path')
const TG = require('./TG')
const { InvalidEventError, ClientCreateError, ClientNotCreatedError } = require('./Errors')

const { buildQuery, getInput, emptyFunction } = require('./utils')

const tdLibWD = path.resolve(process.cwd(), '.td')

class Client {
  constructor(options = {}) {
    const defaultOptions = {
      apiId: null,
      apiHash: null,
      binaryPath: 'libtdjson',
      verbosityLevel: 2,
      tdlibParameters: {
        'use_message_database': true,
        'use_secret_chats': false,
        'system_language_code': 'en',
        'application_version': '1.0',
        'device_model': 'tglib',
        'system_version': 'node',
        'enable_storage_optimizer': true,
      },
    }
    this.options = {
      ...defaultOptions,
      ...options,
    }
    const connectPromise = new Promise((resolve) => { this.resolver = resolve })
    this.connect = () => connectPromise
    this.client = null
    this.tg = null
    this.fetching = {}
    this.listeners = {
      '_update': emptyFunction,
      '_error': emptyFunction,
    }
    this.init()
  }

  async init() {
    try {
      this.tdlib = ffi.Library(
        path.resolve(process.cwd(), this.options.binaryPath),
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
      this.tdlib.td_set_log_file_path(path.resolve(process.cwd(), '_td_logs.txt'))
      this.tdlib.td_set_log_verbosity_level(this.options.verbosityLevel)
      this.tdlib.td_set_log_fatal_error_callback(ffi.Callback('void', ['string'], (message) => {
        console.error('TDLib Fatal Error:', message)
      }))
      this.client = await this._create()
      this.tg = new TG(this)
      this.loop()
    } catch (error) {
      throw new ClientCreateError(error)
    }
  }

  on(eventName, listener) {
    const validNames = Object.keys(this.listeners)
    if (validNames.indexOf(eventName) < 0) {
      throw new InvalidEventError(eventName)
    }
    this.listeners[eventName] = listener
  }

  async loop() {
    const update = await this._receive()
    if (!update) {
      return this.loop()
    }
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
    this.loop()
  }

  async handleAuth(update) {
    switch (update['authorization_state']['@type']) {
      case 'authorizationStateWaitTdlibParameters': {
        await this._send({
          '@type': 'setTdlibParameters',
          'parameters': {
            ...this.options.tdlibParameters,
            '@type': 'tdlibParameters',
            'database_directory': path.resolve(tdLibWD, this.options.phoneNumber, '_td_database'),
            'files_directory': path.resolve(tdLibWD, this.options.phoneNumber, '_td_files'),
            'api_id': this.options.apiId,
            'api_hash': this.options.apiHash,
          },
        })
        break
      }
      case 'authorizationStateWaitEncryptionKey': {
        await this._send({
          '@type': 'checkDatabaseEncryptionKey',
        })
        break
      }
      case 'authorizationStateWaitPhoneNumber': {
        await this._send({
          '@type': 'setAuthenticationPhoneNumber',
          'phone_number': this.options.phoneNumber,
        })
        break
      }
      case 'authorizationStateWaitCode': {
        const code = await getInput('input', `[${this.options.phoneNumber}] Please enter auth code: `)
        await this._send({
          '@type': 'checkAuthenticationCode',
          'code': code,
        })
        break
      }
      case 'authorizationStateWaitPassword': {
        const passwordHint = update['authorization_state']['password_hint']
        const password = await getInput(
            'password',
            `[${this.options.phoneNumber}] Please enter password (${passwordHint}): `
        )
        await this._send({
          '@type': 'checkAuthenticationPassword',
          'password': password,
        })
        break
      }
      case 'authorizationStateReady': {
        this.resolver()
        break
      }
      default:
        break
    }
  }

  async handleError(update) {
    switch (update['message']) {
      case 'PHONE_CODE_EMPTY':
      case 'PHONE_CODE_INVALID': {
        const code = await getInput('input', `[${this.options.phoneNumber}] Wrong auth code, please re-enter: `)
        await this._send({
          '@type': 'checkAuthenticationCode',
          'code': code,
        })
        break
      }
      case 'PASSWORD_HASH_INVALID': {
        const password = await getInput('password', `[${this.options.phoneNumber}] Wrong password, please re-enter: `)
        await this._send({
          '@type': 'checkAuthenticationPassword',
          'password': password,
        })
        break
      }
      default:
        this.listeners['_error'].call(null, update)
        break
    }
  }

  async handleUpdate(update) {
    const id = update['@extra']
    if (this.fetching[id]) {
      delete update['@extra']
      this.fetching[id](update)
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
      default:
        this.listeners['_update'].call(null, update)
    }
  }

  async fetch(query) {
    const id = uuidv4()
    query['@extra'] = id
    const receiveUpdate = new Promise((resolve, reject) => {
      this.fetching[id] = resolve
      // timeout after 29 seconds
      setTimeout(() => {
        delete this.fetching[id]
        reject('Query timed out after 29 seconds.')
      }, 1000 * 29)
    })
    await this._send(query)
    const result = await receiveUpdate
    return result
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
        return reject(new ClientNotCreatedError)
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
        return reject(new ClientNotCreatedError)
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
        return reject(new ClientNotCreatedError)
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
