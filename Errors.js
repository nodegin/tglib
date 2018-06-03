class InvalidEventError extends Error {
  constructor(eventName) {
    super()
    this.message = `"${eventName}" is not a valid event name.`
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
    this.message = `Client is not created.`
  }
}

class ClientFetchError extends Error {
  constructor(update) {
    super()
    this.message = JSON.stringify(update)
  }
}

module.exports = {
  InvalidEventError,
  ClientCreateError,
  ClientNotCreatedError,
  ClientFetchError,
}
