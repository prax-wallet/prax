import { createClient } from './utils.js';
import { IbcClientService } from '@penumbra-zone/protobuf';
export class IbcClientQuerier {
    client;
    constructor({ grpcEndpoint }) {
        this.client = createClient(grpcEndpoint, IbcClientService);
    }
    async ibcClientStates(req) {
        return await this.client.clientStates(req);
    }
}
