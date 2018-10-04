## tglib

TDLib (Telegram Database library) bindings for Node.js

[![npm](https://img.shields.io/npm/v/tglib.svg)](https://www.npmjs.com/package/tglib)

-----

### Getting started

1. Build the binary (https://github.com/tdlib/td#building)
2. `npm i -S tglib`

-----

### Options

- `dataDir`: Allows you to specify custom directory for your tglib user data. Defaults currect working directory.
- `binaryPath`: Allows you to specify the path for TDLib binary. Defaults `libtdjson` in currect working directory.

-----

### APIs

tglib provide some useful methods that makes your Telegram app development easier.

Most API classes/methods can be found in the official [TDLib documentation](https://core.telegram.org/tdlib/docs/classes.html).

#### Authorizing an user

```js
const client = new Client({
  apiId: 'YOUR_API_ID',
  apiHash: 'YOUR_API_HASH',
  auth: {
    type: 'user',
    value: 'YOUR_PHONE_NUMBER',
  },
})
```

#### Authorizing a bot

```js
const client = new Client({
  apiId: 'YOUR_API_ID',
  apiHash: 'YOUR_API_HASH',
  auth: {
    type: 'bot',
    value: 'YOUR_BOT_TOKEN',
  },
})
```

#### ![](https://placehold.it/12/efcf39/000?text=+) Low Level APIs


##### `client.ready`


This promise is used for initializing tglib client and connect with Telegram.

```js
await client.ready
```


##### `client.registerCallback(key, callback)` -> Void


<details>
<summary>Expand</summary>
<p>

This API is provided by tglib, you can use this API to register your function in order to receive callbacks.

The authorization process can be overridden here by registering `td:getInput` callback.

```js
client.registerCallback('td:update', (update) => console.log(update))
client.registerCallback('td:error', (error) => console.error(error))
client.registerCallback('td:getInput', async (args) => {
  const result = await getInputFromUser(args)
  return result
})
```
</p>
</details>


##### `client._send(query)` -> Promise -> Object


<details>
<summary>Expand</summary>
<p>

This API is provided by TDLib, you can use this API to send asynchronous message to Telegram.

```js
await client._send({
  '@type': 'sendMessage',
  'chat_id': -123456789,
  'input_message_content': {
    '@type': 'inputMessageText',
    'text': {
      '@type': 'formattedText',
      'text': '👻',
    },
  },
})
```
</p>
</details>


##### `client._execute(query)` -> Promise -> Object


<details>
<summary>Expand</summary>
<p>

This API is provided by TDLib, you can use this API to execute synchronous action to Telegram.

```js
await client._execute({
  '@type': 'getTextEntities',
  'text': '@telegram /test_command https://telegram.org telegram.me',
})
```
</p>
</details>


##### `client._destroy()` -> Promise -> Void


<details>
<summary>Expand</summary>
<p>

This API is provided by TDLib, you can use this API to destroy the client.

```js
await client._destroy()
```
</p>
</details>


##### `client.fetch(query)` -> Promise -> Object


<details>
<summary>Expand</summary>
<p>

This API is provided by tglib, you can use this API to send asynchronous message to Telegram and receive response.

```js
const chats = await client.fetch({
  '@type': 'getChats',
  'offset_order': '9223372036854775807',
  'offset_chat_id': 0,
  'limit': 100,
})
```
</p>
</details>


#### ![](https://placehold.it/12/3abc64/000?text=+) High Level APIs


tglib provides a collection of APIs that designed for ease of use and handiness. These APIs are located under `client.tg` property.


##### `client.tg.sendTextMessage(args = {})` -> Promise -> Void


<details>
<summary>Expand</summary>
<p>

This API is provided by tglib, you can use this API to send message to a chat. The function will combine custom options specified in `args` with its default.

The `TextStruct` struct uses "parseTextEntities" method which requires TDLib 1.1.0 or above, see [TDLib changelog](https://git.io/tdlibchanges) for details.

```js
const { TextStruct } = require('tglib/structs')

await client.tg.sendTextMessage({
  '$text': new TextStruct('`Hello` world!', 'textParseModeMarkdown'),
  'chat_id': 123456789,
  'disable_notification': true,
  'clear_draft': false,
})
```
</p>
</details>


##### `client.tg.sendPhotoMessage(args = {})` -> Promise -> Void


<details>
<summary>Expand</summary>
<p>

This API is provided by tglib, you can use this API to send photo to a chat. The function will combine custom options specified in `args` with its default.

The `TextStruct` struct uses "parseTextEntities" method which requires TDLib 1.1.0 or above, see [TDLib changelog](https://git.io/tdlibchanges) for details.

```js
const { TextStruct } = require('tglib/structs')

await client.tg.sendPhotoMessage({
  '$caption': new TextStruct('Such doge much wow'),
  'chat_id': 123456789,
  'path': '/tmp/doge.jpg',
  'ttl': 5,
})
```
</p>
</details>


##### `client.tg.updateUsername(username, supergroupId = null)` -> Promise -> Void


<details>
<summary>Expand</summary>
<p>

This API is provided by tglib, you can use this API to update the username for session user or a supergroup chat.

This API uses "checkChatUsername" method which requires TDLib 1.2.0 or above, see [TDLib changelog](https://git.io/tdlibchanges) for details.

```js
await client.tg.updateUsername('a_new_username')
```
</p>
</details>


##### `client.tg.getAllChats()` -> Promise -> Array


<details>
<summary>Expand</summary>
<p>

This API is provided by tglib, you can use this API to get all available chats of session user.

```js
const chats = await client.tg.getAllChats()
```
</p>
</details>


##### `client.tg.openSecretChat(userId)` -> Promise -> Object


<details>
<summary>Expand</summary>
<p>

This API is provided by tglib, you can use this API to open a secret chat with given user ID.

Note: Secret chats are associated with the corresponding TDLib folder. (i.e. only available on the same device).

```js
const chat = await client.tg.openSecretChat(123456789)
```
</p>
</details>


##### `client.tg.deleteChat(chatId)` -> Promise -> Void


<details>
<summary>Expand</summary>
<p>

This API is provided by tglib, you can use this API to delete a chat and remove it from the chat list. You can use this API to delete "private", "secret", "basicGroup", and "supergroup" chats.

```js
await client.tg.deleteChat(-12345678901234)
```
</p>
</details>


##### `client.tg.getChat(args = {})` -> Promise -> Object


<details>
<summary>Expand</summary>
<p>

This API is provided by tglib, you can use this API to get a chat by username or chat id. This method requires either `username` option, or `chat_id` option.

```js
const chat1 = await client.tg.getChat({ username: 'chat_username' })
const chat2 = await client.tg.getChat({ chat_id: '-12345678901234' })
```
</p>
</details>

-----

### Requirements

- Node.js 10 preferred (minimum >= 9.0.0)
> Note: If you are using Node.js 9.x, you may encounter a warning message `Warning: N-API is an experimental feature and could change at any time.`, this can be suppressed by upgrading to version 10.

- TDLib binary (see build instructions below)

> [Windows](https://github.com/c0re100/F9TelegramUtils#compile-tdlib-on-windows)

> [macOS](https://github.com/tdlib/td#macos)

> [Linux - CentOS 7.5](https://github.com/nodegin/tglib/blob/master/examples/centos_75.sh)

Note: building TDLib binary requires at least 8GB of memory, otherwise building process will fail. Building in a Docker container is recommended.

-----

### License

tglib uses the same license as TDLib. See [tdlib/td](https://github.com/tdlib/td) for more information.
