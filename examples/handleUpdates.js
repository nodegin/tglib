const { Client } = require('tglib')

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
      return 'user'
    } else if (args.string === 'tglib.input.AuthorizationValue') {
      return 'YOUR_INTERNATIONAL_PHONE_NUMBER'
    }
    return await defaultHandler(args)
  })

  client.registerCallback('td:update', (update) => {
    console.log('Got update:', JSON.stringify(update, null, 2))
  })

  client.registerCallback('td:error', (update) => {
    console.error('Got error:', JSON.stringify(update, null, 2))
  })

  await client.ready
}()
