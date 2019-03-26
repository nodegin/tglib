export default class InvalidBotTokenError extends Error {
  constructor() {
    super()
    this.message = 'Provided Bot Token is not valid'
  }
}
