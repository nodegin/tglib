## Changelog

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
