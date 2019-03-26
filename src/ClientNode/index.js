import ClientBase from '../ClientBase'

import ffi from 'ffi-napi'
import fs from 'fs-extra'
import path from 'path'
import { buildQuery, getInput } from './utils'
import {
  ClientCreateError,
  ClientNotCreatedError,
} from '../errors/index.js'

class ClientNode extends ClientBase {
  constructor(options = {}) {
    super('node', {
      appDir: path.resolve(process.cwd(), '__tglib__'),
      binaryPath: path.resolve(process.cwd(), 'libtdjson'),
      ...options,
    })
    // register inquirer getInput function as default
    this.registerCallback('td:getInput', getInput)
  }

  async init() {
    try {
      const {
        appDir,
        binaryPath,
        verbosityLevel,
      } = this.options

      await fs.ensureDir(appDir)

      // update options
      this.options.filesDir = path.resolve(appDir, 'files')
      this.options.databaseDir = path.resolve(appDir, 'database')

      this.tdlib = ffi.Library(binaryPath, {
        'td_json_client_create'          : ['pointer', []],
        'td_json_client_send'            : ['void'   , ['pointer', 'string']],
        'td_json_client_receive'         : ['string' , ['pointer', 'double']],
        'td_json_client_execute'         : ['string' , ['pointer', 'string']],
        'td_json_client_destroy'         : ['void'   , ['pointer']],
        'td_set_log_file_path'           : ['int'    , ['string']],
        'td_set_log_verbosity_level'     : ['void'   , ['int']],
        'td_set_log_fatal_error_callback': ['void'   , ['pointer']],
      })
      this.tdlib.td_set_log_file_path(path.resolve(appDir, 'logs.txt'))
      this.tdlib.td_set_log_verbosity_level(verbosityLevel)
      this.tdlib.td_set_log_fatal_error_callback(ffi.Callback('void', ['string'], (message) => {
        console.error('TDLib Fatal Error:', message)
      }))

      this.client = await this._create()
    } catch (error) {
      this.rejector(new ClientCreateError(error))
      return
    }
    this.loop()
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

export default ClientNode
