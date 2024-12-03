import { createClient } from './utils.js';
import { AppService } from '@penumbra-zone/protobuf';
export class AppQuerier {
    client;
    constructor({ grpcEndpoint }) {
        this.client = createClient(grpcEndpoint, AppService);
    }
    async appParams() {
        const { appParameters } = await this.client.appParameters({});
        if (!appParameters) {
            throw new Error('no app parameters in response');
        }
        return appParameters;
    }
    async txsByHeight(blockHeight) {
        const { blockHeight: responseHeight, transactions } = await this.client.transactionsByHeight({
            blockHeight,
        });
        if (responseHeight !== blockHeight) {
            throw new Error(`block height mismatch: requested ${blockHeight}, received ${responseHeight}`);
        }
        return transactions;
    }
}
