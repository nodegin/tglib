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

  await client._send({
    '@type': 'sendMessage',
    'chat_id': -123456789,
    'input_message_content': {
      '@type': 'inputMessageText',
      'text': {
        '@type': 'formattedText',
        'text': 'Hi',
      },
    },
  })
}()
