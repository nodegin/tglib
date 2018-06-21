// combine the user-supplied options with the referencing base options
function combine(object, options) {
  Object.keys(object).forEach((key) => {
    if (object[key] instanceof Object) {
      combine(object[key], options)
    } else if (options[key] !== undefined) {
      object[key] = options[key]
    }
  })
}

class TG {
  constructor(client) {
    this.client = client
  }

  /*
   *  Sends text message to a existing chat.
   *  Method "parseTextEntities" requires TDLib 1.1.0 (git.io/tdlibchanges).
   */
  async sendTextMessage(chatId, text, options = {}) {
    let formattedText
    switch (options.parse_mode) {
      case 'html':
        formattedText = await this.client._execute({
          '@type': 'parseTextEntities',
          'parse_mode': { '@type': 'textParseModeHTML' },
          text,
        })
        break
      case 'markdown':
        formattedText = await this.client._execute({
          '@type': 'parseTextEntities',
          'parse_mode': { '@type': 'textParseModeMarkdown' },
          text,
        })
        break
      default: {
        formattedText = {
          '@type': 'formattedText',
          text,
        }
        break
      }
    }
    const payload = {
      '@type': 'sendMessage',
      'chat_id': chatId,
      'reply_to_message_id': 0,
      'disable_notification': false,
      'from_background': true,
      'reply_markup': null,
      'input_message_content': {
        '@type': 'inputMessageText',
        'text': formattedText,
        'disable_web_page_preview': true,
        'clear_draft': true,
      },
    }
    combine(payload, options)
    return this.client.fetch(payload)
  }

  /*
   *  Get all chats.
   */
  async getAllChats() {
    let { chat_ids: chats} = await this.client.fetch({
      '@type': 'getChats', 
      'offset_order': '9223372036854775807',
      'offset_chat_id': 0,
      'limit': 99999,
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
}

module.exports = TG
