export default class ClientNotCreatedError extends Error {
    constructor(error) {
        super(error);
        this.message = "Client is not created";
    }
}
