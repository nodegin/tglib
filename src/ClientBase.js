import { crc32 } from 'crc'
import TG from './TG'
import { version as appVersion } from '../package.json'
import {
  InvalidCallbackError,
  InvalidBotTokenError,
  ClientFetchError,
} from './errors/index.js'

class Client {
  constructor(mode, options = {}) {
    const defaultOptions = {
      apiId: null,
      apiHash: null,
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
    this.tg = new TG(this)
    this.hijackers = {}
    this.downloading = {}
    this.fetching = {}
    this.callbacks = {
      'td:update': () => {},
      'td:error': () => {},
      'td:getInput': () => { throw new Error('td:getInput callback is not set.') },
    }
    this.init()
  }

  registerCallback(key, callback) {
    const validNames = Object.keys(this.callbacks)
    if (validNames.indexOf(key) < 0) {
      throw new InvalidCallbackError(key)
    }
    this.callbacks[key] = callback
  }

  async loop() {
    if (!this.client) {
      // when client has been destroyed, stop the update loop
      return
    }
    const update = await this._receive()
    if (update) {
      if (this.hijackers[update['@type']]) {
        // for tglib update hijacking
        this.hijackers[update['@type']](update)
      } else {
        // handle update normally
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
    }
    setTimeout(() => this.loop(), 1)
  }

  _hijackUpdate(type, callback) {
    if (typeof callback === 'function') {
      this.hijackers[type] = callback
    } else {
      delete this.hijackers[type]
    }
  }

  async handleAuth(update) {
    switch (update['authorization_state']['@type']) {
      case 'authorizationStateWaitTdlibParameters': {
        this._send({
          '@type': 'setTdlibParameters',
          'parameters': {
            ...this.options.tdlibParameters,
            '@type': 'tdlibParameters',
            'api_id': this.options.apiId,
            'api_hash': this.options.apiHash,
            'database_directory': this.options.databaseDir,
            'files_directory': this.options.filesDir,
          },
        })
        break
      }
      case 'authorizationStateWaitEncryptionKey': {
        this._send({ '@type': 'checkDatabaseEncryptionKey' })
        break
      }
      case 'authorizationStateWaitPhoneNumber': {
        const type = await this.callbacks['td:getInput']({
          string: 'tglib.input.AuthorizationType',
        })
        const value = await this.callbacks['td:getInput']({
          string: 'tglib.input.AuthorizationValue',
        })
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
        payload['code'] = await this.callbacks['td:getInput']({
          string: 'tglib.input.AuthorizationCode',
        })
        this._send(payload)
        break
      }
      case 'authorizationStateWaitRegistration': {
        const payload = { '@type': 'registerUser' };
        console.log(`User has not yet been registered with Telegram`);
        payload['first_name'] = await this.callbacks['td:getInput']({
          string: 'tglib.input.FirstName',
        });
        this._send(payload);
        break
      }
      case 'authorizationStateWaitPassword': {
        this.authFlowPasswordHint = update['authorization_state']['password_hint']
        const password = await this.callbacks['td:getInput']({
          string: 'tglib.input.AuthorizationPassword',
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
          string: 'tglib.input.AuthorizationCodeIncorrect',
        })
        this._send({
          '@type': 'checkAuthenticationCode',
          'code': code,
        })
        break
      }
      case 'PASSWORD_HASH_INVALID': {
        const password = await this.callbacks['td:getInput']({
          string: 'tglib.input.AuthorizationPasswordIncorrect',
          extras: { hint: this.authFlowPasswordHint },
        })
        this._send({
          '@type': 'checkAuthenticationPassword',
          'password': password,
        })
        break
      }
      case 'ACCESS_TOKEN_INVALID': {
        this.rejector(new InvalidBotTokenError())
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
      case 'updateFile': {
        const fileId = update['file']['id']
        if (!this.downloading[fileId]) {
          // default handle
          this.callbacks['td:update'].call(null, update)
          return
        }
        if (!update['file']['local']['path'].length) {
          // not yet downloaded
          return
        }
        // resolve downloaded
        this.downloading[fileId](update['file'])
      }
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
        reject('Query timed out after 30 seconds.')
      }, 1000 * 30)
    })
    await this._send(query)
    return receiveUpdate
  }
}

export default Client
