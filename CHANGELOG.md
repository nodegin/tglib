## Changelog

#### tglib v3.0.3

- Added a new high level API `client.tg.download` for downloading files

-----

#### tglib v3.0.2

- Fix WASM verbosity setting for TDLib 1.4.0 (provides official WASM suppor & example)

-----

#### tglib v3.0.1

- Added a new high level API `client.tg.call`

-----

#### tglib v3.0.0

WARNING: This release came with multiple breaking changes, please see README.md / examples for updated usages.

- Breaking changes: Removed `dataDir` option in flavor of `appDir`
- Breaking changes: Removed `auth` option
- Added support for WebAssembly

-----

#### tglib v2.1.0

- Added a new option `dataDir` for specifying `__tglib__` data directory.
- Added a new option `binaryPath` for specifying TDLib binary.
- Added a new high level API `client.tg.getChat`.
- Fixed issue #36, update loop will now stop when client is destroyed.

-----

#### tglib v2.0.0

- Breaking changes: Rewrote `client.tg.sendTextMessage`.

*The old way to send text message:*
```js
await client.tg.sendTextMessage('123456789', 'Hello *World*', {
  'parse_mode': 'markdown',
  'disable_notification': true,
  'clear_draft': false,
})
```
*The new way to send text message:*
```js
const { TextStruct } = require('tglib/structs')

await client.tg.sendTextMessage({
  '$text': new TextStruct('`Hello` world!', 'textParseModeMarkdown'),
  'chat_id': 123456789,
  'disable_notification': true,
  'clear_draft': false,
})
```
- Added `tglib/structs` for common structures.
- Added `TextStruct` for formatted text struct, used in `inputMessageText.text`, `inputMessagePhoto.caption`, etc.
```js
const text1 = new TextStruct('Normal text')
const text2 = new TextStruct('`Markdown` text', 'textParseModeMarkdown')
const text3 = new TextStruct('<b>HTML</b> text', 'textParseModeHTML')
```
- Added a new high level API `client.tg.sendPhotoMessage`.
```js
const { TextStruct } = require('tglib/structs')

await client.tg.sendPhotoMessage({
  '$caption': new TextStruct('Such doge much wow'),
  'chat_id': 123456789,
  'path': '/tmp/doge.jpg',
  'ttl': 5,
})
```
- Breaking changes: `client.on` now renamed to `client.registerCallback`.

*The old way to receive updates and errors:*
```js
client.on('_update', (update) => console.log(update))
client.on('_error', (error) => console.error(error))
```

*The new way to receive updates and errors:*
```js
client.registerCallback('td:update', (update) => console.log(update))
client.registerCallback('td:error', (error) => console.error(error))
```
- Added a new callback `td:getInput` to split out the `getInput` function from core, you can now register your own callback function to handle the login process.
```js
client.registerCallback('td:getInput', async (args) => {
  const result = await getInputFromUser(args)
  return result
})
```
-----

#### tglib v1.4

- Added a new high level API `client.tg.updateUsername`.
- Added a new high level API `client.tg.getAllChats`.
- Added a new high level API `client.tg.openSecretChat`.
- Added a new high level API `client.tg.deleteChat`.
- Fixes new user authorization. (#24)
- Improve documentations.

-----

#### tglib v1.3

- Now support multiple session login by storing files in separate directories. (#16, #19)
- Ability to login as Bots.
```diff
const client = new Client({
  apiId: 'YOUR_API_ID',
  apiHash: 'YOUR_API_HASH',
-  phoneNumber: 'YOUR_PHONE_NUMBER',
+  auth: {
+    type: 'user',
+    value: 'YOUR_PHONE_NUMBER',
+  },
})
```
- Error events for `client.fetch` are now handled. `ClientFetchError` will be thrown if `client.fetch` fails.
- `client.tg.sendMessageTypeText` renamed to `client.tg.sendTextMessage`.
- `client.connect()` changed to `client.ready`.
