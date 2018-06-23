const { Client } = require('tglib')

void async function() {
  const client = new Client({
    apiId: 'YOUR_API_ID',
    apiHash: 'YOUR_API_HASH',
    auth: {
      type: 'user',
      value: 'YOUR_PHONE_NUMBER',
    },
  })

  await client.ready

  client.registerCallback('td:update', (update) => {
    console.log('Got update:', JSON.stringify(update, null, 2))
  })

  client.registerCallback('td:error', (update) => {
    console.error('Got error:', JSON.stringify(update, null, 2))
  })
}()
