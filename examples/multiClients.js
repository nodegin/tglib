const { Client } = require('../tglib')

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

  await clients.alice.sendTextMessage(12345678, 'hello')
}()
