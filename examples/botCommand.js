const { Client } = require('tglib')
const { TextStruct } = require('tglib/structs')

void async function() {
  const client = new Client({
    apiId: 'YOUR_API_ID',
    apiHash: 'YOUR_API_HASH',
  })

  // Save tglib default handler which prompt input at console
  const defaultHandler = client.callbacks['td:getInput']

  // Register own callback for returning auth details
  client.registerCallback('td:getInput', async (args) => {
    if (args.string === 'tglib.input.AuthorizationType') {
      return 'bot'
    } else if (args.string === 'tglib.input.AuthorizationValue') {
      return 'YOUR_BOT_TOKEN'
    }
    return await defaultHandler(args)
  })

  await client.ready

  const { id: myId } = await client.fetch({ '@type': 'getMe' })

  client.registerCallback('td:update', async (update) => {
    if (update['@type'] === 'updateNewMessage') {
      // check if message is sent from self
      const sender = update['message']['sender_user_id']
      if (sender !== myId) {
        const { text: { text } } = update['message']['content']
        let replyText
        if (text.startsWith('/')) {
          replyText = `Are you requested <b>${text}</b>?`
        } else {
          replyText = `Sorry I do not understand <b>${text}</b>.`
        }
        await client.tg.sendTextMessage({
          '$text': new TextStruct(replyText, 'textParseModeHTML'),
          'chat_id': 123456789,
          'disable_notification': true,
          'clear_draft': false,
        })
      }
    }
  })
}()
