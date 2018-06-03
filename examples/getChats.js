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

  const result = await client.fetch({
    '@type': 'getChats',
    'offset_order': '9223372036854775807',
    'offset_chat_id': 0,
    'limit': 100,
  })

  // latest 100 chats will be returned
  console.log(result)
}()
