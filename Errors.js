class InvalidCallbackError extends Error {
  constructor(eventName) {
    super()
    this.message = `"${eventName}" is not a valid callback.`
  }
}

class InvalidBotTokenError extends Error {
  constructor(token) {
    super()
    this.message = `Bot access token "${token}" is not valid`
  }
}

class ClientCreateError extends Error {
  constructor(error) {
    super(error)
    this.message = `Unable to create client: ${error.message}`
  }
}

class ClientNotCreatedError extends Error {
  constructor(error) {
    super(error)
    this.message = 'Client is not created'
  }
}

class ClientFetchError extends Error {
  constructor(update) {
    super()
    this.message = JSON.stringify(update)
  }
}

module.exports = {
  InvalidCallbackError,
  InvalidBotTokenError,
  ClientCreateError,
  ClientNotCreatedError,
  ClientFetchError,
}
