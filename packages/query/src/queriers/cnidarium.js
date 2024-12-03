import { createClient } from './utils.js';
import { CnidariumService } from '@penumbra-zone/protobuf';
import { KeyValueRequest } from '@penumbra-zone/protobuf/penumbra/cnidarium/v1/cnidarium_pb';
import { MerkleRoot } from '@penumbra-zone/protobuf/penumbra/crypto/tct/v1/tct_pb';
export class CnidariumQuerier {
    client;
    constructor({ grpcEndpoint }) {
        this.client = createClient(grpcEndpoint, CnidariumService);
    }
    async fetchRemoteRoot(blockHeight) {
        const keyValueRequest = new KeyValueRequest({
            key: `sct/tree/anchor_by_height/${blockHeight}`,
        });
        const keyValue = await this.client.keyValue(keyValueRequest);
        if (!keyValue.value) {
            throw new Error('no value in KeyValueResponse');
        }
        return MerkleRoot.fromBinary(keyValue.value.value);
    }
}
