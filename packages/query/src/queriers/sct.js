import { createClient } from './utils.js';
import { SctService } from '@penumbra-zone/protobuf';
export class SctQuerier {
    client;
    constructor({ grpcEndpoint }) {
        this.client = createClient(grpcEndpoint, SctService);
    }
    timestampByHeight(req) {
        return this.client.timestampByHeight(req);
    }
}
