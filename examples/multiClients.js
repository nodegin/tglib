const path = require('path')
const { Client, Structs } = require('tglib')

async function initClients() {
  const clients = {}
  const credentials = {
    alice: { type: 'user', value: 'YOUR_INTERNATIONAL_PHONE_NUMBER' },
  }

  for (const key in credentials) {
    try {
      const { type, value } = credentials[key]

      // Create new client for each credential
      // Storing data in corresponding directories
      const client = new Client({
        apiId: 'YOUR_API_ID',
        apiHash: 'YOUR_API_HASH',
        appDir: path.resolve(process.cwd(), `__tglib-${type}-${value}__`),
      })

      // Save tglib default handler which prompt input at console
      const defaultHandler = client.callbacks['td:getInput']
    
      // Register own callback for returning auth details
      client.registerCallback('td:getInput', async (args) => {
        if (args.string === 'tglib.input.AuthorizationType') {
          return type
        } else if (args.string === 'tglib.input.AuthorizationValue') {
          return value
        }
        return await defaultHandler(args)
      })

      // Wait for client ready
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

  await clients.alice.sendTextMessage({
    '$text': new Structs.TextStruct('hello'),
    'chat_id': 123456789,
    'disable_notification': true,
    'clear_draft': false,
  })
}()
