export default class InvalidCallbackError extends Error {
  constructor(eventName) {
    super()
    this.message = `"${eventName}" is not a valid callback.`
  }
}
