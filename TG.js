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
}

module.exports = TG
