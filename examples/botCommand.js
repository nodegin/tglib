const { Client } = require('tglib')

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

  client.on('_update', async (update) => {
    if (update['@type'] === 'updateNewMessage') {
      // check if message is sent from self
      const sender = update['message']['sender_user_id']
      if (sender !== myId) {
        const { text: { text } } = update['message']['content']
        if (text.startsWith('/')) {
          await client.tg.sendTextMessage(sender, `Are you requested "${text}"?`)
        } else {
          await client.tg.sendTextMessage(sender, `Sorry I do not understand "${text}".`)
        }
      }
    }
  })
}()
