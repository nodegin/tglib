const { Client } = require('tglib')

const getClient = (phone) => new Promise((resolve, reject) => {
    const client = new Client({
        apiId: 'YOUR_API_ID',
        apiHash: 'YOUR_API_HASH',
        phoneNumber: phone,
    })
    client
        .connect()
        .then(() => resolve(client))
        .catch(e => reject(e))
})

const doJob = async (phone) => {
    const client = await getClient(phone)
    console.log(await client.fetch({
        '@type': 'getChats',
        'offset_order': '9223372036854775807',
        'offset_chat_id': 0,
        'limit': 10,
    }))
}

(async () => {
    await doJob('YOUR_PHONE_NUMBER_1')
    await doJob('YOUR_PHONE_NUMBER_2')
})()
