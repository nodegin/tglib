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

  client.on('_update', (update) => {
    console.log('Got update:', JSON.stringify(update, null, 2))
  })

  client.on('_error', (update) => {
    console.error('Got error:', JSON.stringify(update, null, 2))
  })
}()
