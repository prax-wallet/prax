import { createClient } from './utils.js';
import { ShieldedPoolService } from '@penumbra-zone/protobuf';
export class ShieldedPoolQuerier {
    client;
    constructor({ grpcEndpoint }) {
        this.client = createClient(grpcEndpoint, ShieldedPoolService);
    }
    async assetMetadataById(assetId) {
        try {
            const { denomMetadata } = await this.client.assetMetadataById({ assetId });
            return denomMetadata;
        }
        catch (e) {
            if (globalThis.__DEV__) {
                console.debug(e);
            }
            return undefined;
        }
    }
}
