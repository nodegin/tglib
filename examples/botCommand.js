const { Client } = require('tglib')
const { TextStruct } = require('tglib/structs')

void async function() {
  const client = new Client({
    apiId: 'YOUR_API_ID',
    apiHash: 'YOUR_API_HASH',
    auth: {
      type: 'bot',
      value: 'YOUR_BOT_TOKEN',
    },
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
