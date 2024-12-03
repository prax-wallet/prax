import { createClient } from './utils.js';
import { TendermintProxyService } from '@penumbra-zone/protobuf';
import { TransactionId } from '@penumbra-zone/protobuf/penumbra/core/txhash/v1/txhash_pb';
import { Transaction } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
export class TendermintQuerier {
    client;
    constructor({ grpcEndpoint }) {
        this.client = createClient(grpcEndpoint, TendermintProxyService);
    }
    async latestBlockHeight() {
        try {
            const { syncInfo } = await this.client.getStatus({});
            return syncInfo?.latestBlockHeight;
        }
        catch (e) {
            if (globalThis.__DEV__) {
                console.debug(e);
            }
            return undefined;
        }
    }
    async broadcastTx(tx) {
        const params = tx.toBinary();
        // Note that "synchronous" here means "wait for the tx to be accepted by
        // the fullnode", not "wait for the tx to be included on chain.
        const { hash, log, code } = await this.client.broadcastTxSync({ params });
        if (code !== 0n) {
            throw new Error(`Tendermint error ${code.toString()}: ${log}`);
        }
        return new TransactionId({ inner: hash });
    }
    async getTransaction(txId) {
        const res = await this.client.getTx({ hash: txId.inner });
        const transaction = Transaction.fromBinary(res.tx);
        return { height: res.height, transaction };
    }
}
