## tglib

TDLib (Telegram Database library) bindings for Node.js

[![npm](https://img.shields.io/npm/v/tglib.svg)](https://www.npmjs.com/package/tglib)

-----

### Getting started

1. Build the binary (https://github.com/tdlib/td#building)
2. `npm i -S tglib`

-----

### Node / WASM support

tglib support both Node and WASM environments:

```js
// CommonJS, loads Node version tglib
const { Client } = require('tglib')

// ESModule, loads WASM version tglib
import { Client } from 'tglib'
```

By default, `package.json` will automatically handle it for you.

If use CommonJS (`require()` function, usally Node.js), it loads `require('tglib/node')`

If use ESModule (`import` syntax, usally bundlers), it loads `import ... from 'tglib/wasm'`

In case something misimported, you can manually set to the correct version you need:

```js
import { Client } from 'tglib/node'
```

-----

### Options

```js
new Client({
  apiId: '', // specify your API ID
  apiHash: '', // specify your API Hash
  verbosityLevel: 2, // specify TDLib verbosity level to control logging, default 2
  tdlibParameters: {}, // specify custom tdlibParameters object

  // Node only options
  appDir: '', // specify where to place tglib files, default "__tglib__" folder
  binaryPath: '', // specify the TDLib static binary path, default "libtdjson" in cwd

  // WASM only options
  wasmModule: null, // specify the WebAssembly module
  filesDir: '', // specify the files directory path
  databaseDir: '', // specify the database directory path
})
```

-----

#### Callbacks / Authorization

You can register callbacks for the following events:

- `td:update`, default empty function
- `td:error`, default empty function
- `td:getInput`, default console prompt in Node, exception in WASM

```js
// register callback for updates
client.registerCallback('td:update', (update) => {
  console.log('[update]', update)
})

// register callback for errors
client.registerCallback('td:error', (error) => {
  console.log('[error]', error)
})
```

The `td:getInput` event can be configured to ask for user input.

It also be used for the authorization flow too.

You MUST register an `async` function or a function that returns a `Promise`.

To authorize a bot:

```js
// Save tglib default handler which prompt input at console
const defaultHandler = client.callbacks['td:getInput']

// Register own callback for returning auth details
client.registerCallback('td:getInput', async (args) => {
  if (args.string === 'tglib.input.AuthorizationType') {
    return 'bot'
  } else if (args.string === 'tglib.input.AuthorizationValue') {
    return 'YOUR_BOT_TOKEN'
  }
  return await defaultHandler(args)
})
```

To authorize an user:

```js
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
```

The `string` property in `td:getInput` argument object is used to determine what the input is:

- `tglib.input.AuthorizationType`, authorization type: `user` or `bot`
- `tglib.input.AuthorizationValue`, authorization value: bot token or phone number
- `tglib.input.FirstName`, first name for new account creation
- `tglib.input.AuthorizationCode`, authorization code received in Telegram or SMS
- `tglib.input.AuthorizationCodeIncorrect`, authorization code re-input if wrong
- `tglib.input.AuthorizationPassword`, authorization password (two-step verification)
- `tglib.input.AuthorizationPasswordIncorrect`, authorization password re-input if wrong

These string can be used as identifier for i18n purpose.

An `extras` property may present in `td:getInput` argument object as well in some events.

Currently, a `extras` property will come up with `hint` property in the following events:

- `tglib.input.AuthorizationPassword`
- `tglib.input.AuthorizationPasswordIncorrect`

The `hint` property here indicates user cloud password hint.

```js
client.registerCallback('td:getInput', async ({ string, extras: { hint } = {} }) => {
  const result = window.prompt(`${string}${hint ? ` ${hint}` : ''}`)
  return result
})
```

-----

### Connect with Telegram

tglib provide a `ready` Promise in client instances.

This Promise will resolve automatically when the authentication flow finishes.

In order words, when user successfully logged into their account, the Promise will be resolved.

```js
const client = new Client(...)

await client.ready

// You are now connected!
await client.tg.sendTextMessage(...)
```

-----

### APIs

tglib provide some useful methods that makes your Telegram app development easier.

Most API classes/methods can be found in the official [TDLib documentation](https://core.telegram.org/tdlib/docs/classes.html).

#### ![](https://placehold.it/12/efcf39/000?text=+) Low Level APIs


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


##### `client.tg.sendStickerMessage(args = {})` -> Promise -> Void


<details>
<summary>Expand</summary>
<p>

This API is provided by tglib, you can use this API to send sticker to a chat. The function will combine custom options specified in `args` with its default.

```js
await client.tg.sendStickerMessage({
  'chat_id': 123456789,
  'path': '/tmp/doge.webp',
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


##### `client.tg.call(userId)` -> Promise -> EventEmitter


<details>
<summary>Expand</summary>
<p>

This API is provided by tglib, you can use this API to call an user.

The promise will resolve with an EventEmitter when call succceeded.

The EventEmitter will emit `ready` and `discarded` events.

```js
const emitter = await client.tg.call(4000000001)
emitter.on('ready', (call) => console.log(call))
emitter.on('discarded', (call) => console.log(call))
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

> [Linux - CentOS 7.5](https://gist.github.com/nodegin/e3849aa1e5170c2e05942ffe86e4f8c9)

Note: building TDLib binary requires at least 8GB of memory (or more...), otherwise building process will fail. Build in containers are recommended.

-----

### License

tglib uses the same license as TDLib. See [tdlib/td](https://github.com/tdlib/td) for more information.
