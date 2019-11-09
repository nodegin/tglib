export default class ClientFetchError extends Error {
    constructor(update) {
        super();
        this.message = JSON.stringify(update);
    }
}
