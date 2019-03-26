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

  await client.ready

  const result = await client.fetch({
    '@type': 'getChats',
    'offset_order': '9223372036854775807',
    'offset_chat_id': 0,
    'limit': 100,
  })

  // latest 100 chat id will be returned
  console.log(result)
}()
