import ClientBase from "../ClientBase";

import {
    ClientCreateError,
    ClientNotCreatedError,
} from "../errors/index.js";

class ClientWASM extends ClientBase {
    constructor(options = {}) {
        super("wasm", options);
    }

    async init() {
        try {
            const {
                verbosityLevel,
                wasmModule,
            } = this.options;

            // See also:
            // https://github.com/tdlib/td/blob/master/td/telegram/td_emscripten.cpp
            // https://github.com/tdlib/td/blob/master/example/web/tdweb/src/worker.js#L495
            this.tdlib = {
                td_create:        wasmModule.cwrap("td_create", "number", []),
                td_send:          wasmModule.cwrap("td_send", null, ["number", "string"]),
                td_receive:       wasmModule.cwrap("td_receive", "string", ["number"]),
                td_execute:       wasmModule.cwrap("td_execute", "string", ["number", "string"]),
                td_destroy:       wasmModule.cwrap("td_destroy", null, ["number"]),
            };
            this.tdlib.td_execute(
                0,
                JSON.stringify({
                    "@type": "setLogVerbosityLevel",
                    new_verbosity_level: verbosityLevel,
                })
            );

            this.client = await this._create();
        } catch (error) {
            this.rejector(new ClientCreateError(error));
            return;
        }
        this.loop();
    }

    async _create() {
        const client = await this.tdlib.td_create();
        return client;
    }

    async _send(query) {
        if (!this.client) {
            throw new ClientNotCreatedError();
        }
        const response = await this.tdlib.td_send(this.client, JSON.stringify(query));
        if (!response) {
            return null;
        }
        return JSON.parse(response);
    }

    async _receive() {
        if (!this.client) {
            throw new ClientNotCreatedError();
        }
        const response = await this.tdlib.td_receive(this.client);
        if (!response) {
            return null;
        }
        return JSON.parse(response);
    }

    async _execute(query) {
        if (!this.client) {
            throw new ClientNotCreatedError();
        }
        const response = await this.tdlib.td_execute(this.client, JSON.stringify(query));
        if (!response) {
            return null;
        }
        return JSON.parse(response);
    }

    async _destroy() {
        if (this.client) {
            await this.tdlib.td_destroy(this.client);
            this.client = null;
        }
    }
}

export default ClientWASM;
