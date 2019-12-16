import EventEmitter from 'event-emitter'

// combine the user-supplied options with the referencing base options
function combine(object, options, whitelistedKeys) {
  Object.keys(object).forEach((key) => {
    if (object[key] instanceof Object) {
      combine(object[key], options, whitelistedKeys)
    } else if (options[key] !== undefined && whitelistedKeys.indexOf(key) >= 0) {
      object[key] = options[key]
    }
  })
}

class TG {
  constructor(client) {
    this.client = client
  }

  /*
   *  Send text message to an existing chat.
   *  Method "parseTextEntities" requires TDLib 1.1.0 (git.io/tdlibchanges).
   */
  async sendTextMessage(args = {}) {
    const { $text, ...options } = args
    if (!$text) {
      throw new Error('No text defined for method "sendTextMessage".')
    }
    const payload = {
      '@type': 'sendMessage',
      'chat_id': 0,
      'reply_to_message_id': 0,
      'disable_notification': false,
      'from_background': true,
      'reply_markup': null,
      'input_message_content': {
        '@type': 'inputMessageText',
        'text': await $text._format(this.client),
        'disable_web_page_preview': true,
        'clear_draft': true,
      },
    }
    combine(payload, options, [
      'chat_id', 'reply_to_message_id', 'disable_notification', 'from_background',
      'disable_web_page_preview', 'clear_draft',
    ])
    return this.client.fetch(payload)
  }

  /*
   *  Send photo message to an existing chat.
   */
  async sendPhotoMessage(args = {}) {
    const { $caption, ...options } = args
    const payload = {
      '@type': 'sendMessage',
      'chat_id': 0,
      'reply_to_message_id': 0,
      'disable_notification': false,
      'from_background': true,
      'reply_markup': null,
      'input_message_content': {
        '@type': 'inputMessagePhoto',
        'photo': {
          '@type': 'inputFileLocal',
          'path': null,
        },
        'thumbnail': null,
        'added_sticker_file_ids': [],
        'width': 0,
        'height': 0,
        'caption': $caption ? await $caption._format(this.client) : null,
        'ttl': 0,
      },
    }
    combine(payload, options, [
      'chat_id', 'reply_to_message_id', 'disable_notification', 'from_background',
      'path', 'thumbnail', 'added_sticker_file_ids', 'width', 'height', 'ttl',
    ])
    return this.client.fetch(payload)
  }

  /*
   *  Send sticker message to an existing chat.
   */
  async sendStickerMessage(args = {}) {
    const { $caption, ...options } = args
    if (!options.path || !options.path.endsWith('webp')) {
      throw 'WebP image must be passed for [sendStickerMessage] method'
    }
    const payload = {
      '@type': 'sendMessage',
      'chat_id': 0,
      'reply_to_message_id': 0,
      'disable_notification': false,
      'from_background': true,
      'reply_markup': null,
      'input_message_content': {
        '@type': 'inputMessageSticker',
        'sticker': {
          '@type': 'inputFileLocal',
          'path': null,
        },
        'thumbnail': null,
        'width': 0,
        'height': 0,
      },
    }
    combine(payload, options, [
      'chat_id', 'reply_to_message_id', 'disable_notification', 'from_background',
      'path', 'thumbnail', 'width', 'height',
    ])
    return this.client.fetch(payload)
  }

  /*
   *  Get all chats.
   */
  async getAllChats() {
    let { chat_ids: chats } = await this.client.fetch({
      '@type': 'getChats', 
      'offset_order': '9223372036854775807',
      'offset_chat_id': 0,
      'limit': Math.floor(Math.random() * 9999999),
    })
    chats = chats.map((chatId) => this.client.fetch({
      '@type': 'getChat', 
      'chat_id': chatId,
    }))
    chats = await Promise.all(chats)
    return chats
  }

  /*
   *  Update user's username.
   *  Method "checkChatUsername" requires TDLib 1.2.0 (git.io/tdlibchanges).
   */
  updateUsername(username, supergroupId = null) {
    return new Promise(async (resolve, reject) => {
      let payload
      // Check the username
      payload = { '@type': 'checkChatUsername', username }
      if (supergroupId) {
        const { id } = await this.client.fetch({ '@type': 'createSupergroupChat', 'supergroup_id': supergroupId })
        payload['chat_id'] = id
      } else {
        const { id } = await this.client.fetch({ '@type': 'getMe' })
        payload['chat_id'] = id
      }
      const { '@type': checkResult } = await this.client.fetch(payload)
      if (checkResult !== 'checkChatUsernameResultOk') {
        return reject(checkResult)
      }
      // Update the username
      payload = { '@type': 'setUsername', username }
      if (supergroupId) {
        payload['@type'] = 'setSupergroupUsername'
        payload['supergroup_id'] = supergroupId
      }
      const result = await this.client.fetch(payload)
      resolve(result)
    })
  }

  /*
   *  Opens a secret chat with given user ID.
   */
  async openSecretChat(userId) {
    let secretChat = await this.getAllChats()
    secretChat = secretChat.find(({ type: { '@type': type, user_id: user } }) => {
      return type === 'chatTypeSecret' && user === userId
    })
    // created already
    if (secretChat) {
      return secretChat
    }
    // create new secret chat
    secretChat = await this.client.fetch({
      '@type': 'createNewSecretChat',
      'user_id': userId,
    })
    return secretChat
  }

  /*
   *  Close and remove a chat.
   */
  async deleteChat(chatId) {
    const chat = await this.client.fetch({
      '@type': 'getChat',
      'chat_id': chatId,
    })

    let payload = {}
    switch (chat.type['@type']) {
      case 'chatTypeBasicGroup':
      case 'chatTypeSupergroup': {
        const { id } = await this.client.fetch({ '@type': 'getMe' })
        payload['@type'] = 'setChatMemberStatus'
        payload['user_id'] = id
        payload['chat_id'] = chat.id
        payload['status'] = { '@type': 'chatMemberStatusLeft' }
        break
      }
      case 'chatTypeSecret': {
        payload['@type'] = 'closeSecretChat'
        payload['secret_chat_id'] = chat.type.secret_chat_id
        break
      }
      default: {
        payload['@type'] = 'closeChat'
        payload['chat_id'] = chat.id
        break
      }
    }
    await this.client.fetch(payload)
    await this.client.fetch({
      '@type': 'deleteChatHistory',
      'chat_id': chat.id,
      'remove_from_chat_list': true,
    })
  }

  /*
   *  Get chat by username or id
   */
  async getChat(args = {}) {
    const { username, chat_id } = args
    let chat = {}
    if (username) {
      chat = await this.client.fetch({
        '@type': 'searchPublicChat',
        username,
      })
    } else if (chat_id) {
      chat = await this.client.fetch({
        '@type': 'getChat',
        chat_id,
      })
    } else {
      throw new Error('Neither username nor chat_id were specified for method "getChat"')
    }
    return chat
  }

  /*
   *  Download a file
   */
  async download(remoteFileId) {
    const { id } = await this.client.fetch({
      '@type': 'getRemoteFile',
      'remote_file_id': remoteFileId,
    })
    let file = await this.client.fetch({
      '@type': 'downloadFile',
      'file_id': id,
      'priority': 1,
    })
    if (!file['local']['path'].length) {
      const downloadPromise = new Promise((resolve) => {
        this.client.downloading[id] = resolve
      })
      file = await downloadPromise
    }
    return file
  }


  /*
   *  Call an user
   */
  call(userId) {
    return new Promise(async (resolve, reject) => {
      try {
        const { id } = await this.client.fetch({
          '@type': 'createCall',
          'user_id': userId,
          'protocol': {
            '@type': 'callProtocol',
            'udp_p2p': true,
            'udp_reflector': true,
            'min_layer': 65,
            'max_layer': 65,
          },
        })
        const emitter = EventEmitter()
        this.client._hijackUpdate('updateCall', (update) => {
          // If call failed due to USER_PRIVACY_RESTRICTED
          if (update.call.state['@type'] === 'callStateError') {
            this.client._hijackUpdate('updateCall', false)
            return reject(update.call.state.error)
          }
          if (update.call.state['@type'] === 'callStateReady') {
            emitter.emit('ready', update.call)
          }
          if (update.call.state['@type'] === 'callStateDiscarded') {
            emitter.emit('discarded', update.call)
            this.client._hijackUpdate('updateCall', false)
          }
          return resolve(emitter)
        })
      } catch (err) {
        reject(err)
      }
    })
  }
}

export default TG
