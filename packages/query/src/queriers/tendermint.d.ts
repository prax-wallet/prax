import { TransactionId } from '@penumbra-zone/protobuf/penumbra/core/txhash/v1/txhash_pb';
import { Transaction } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import type { TendermintQuerierInterface } from '@penumbra-zone/types/querier';
declare global {
    var __DEV__: boolean | undefined;
}
export declare class TendermintQuerier implements TendermintQuerierInterface {
    private readonly client;
    constructor({ grpcEndpoint }: {
        grpcEndpoint: string;
    });
    latestBlockHeight(): Promise<bigint | undefined>;
    broadcastTx(tx: Transaction): Promise<TransactionId>;
    getTransaction(txId: TransactionId): Promise<{
        height: bigint;
        transaction: Transaction;
    }>;
}
//# sourceMappingURL=tendermint.d.ts.map