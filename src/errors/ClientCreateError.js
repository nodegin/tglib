export default class ClientCreateError extends Error {
  constructor(error) {
    super(error)
    this.message = `Unable to create client: ${error.message}`
  }
}
