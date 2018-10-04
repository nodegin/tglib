const { Client } = require('tglib')
const { TextStruct } = require('tglib/structs')

async function initClients() {
  const clients = {}
  const credentials = {
    alice: { type: 'user', value: 'YOUR_PHONE_NUMBER' },
  }

  for (const key in credentials) {
    try {
      const client = new Client({
        apiId: 'YOUR_API_ID',
        apiHash: 'YOUR_API_HASH',
        auth: credentials[key],
      })
      await client.ready
      clients[key] = client
    } catch (e) {
      console.log(`Cannot create ${key}: `, e.message)
    }
  }

  return clients
}

void async function() {
  const clients = await initClients()

  await client.tg.sendTextMessage({
    '$text': new TextStruct('hello'),
    'chat_id': 123456789,
    'disable_notification': true,
    'clear_draft': false,
  })
}()
