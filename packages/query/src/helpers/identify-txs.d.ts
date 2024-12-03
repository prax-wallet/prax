import { CommitmentSource, Nullifier } from '@penumbra-zone/protobuf/penumbra/core/component/sct/v1/sct_pb';
import { StateCommitment } from '@penumbra-zone/protobuf/penumbra/crypto/tct/v1/tct_pb';
import { SpendableNoteRecord, SwapRecord } from '@penumbra-zone/protobuf/penumbra/view/v1/view_pb';
import { Transaction } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { TransactionId } from '@penumbra-zone/protobuf/penumbra/core/txhash/v1/txhash_pb';
import { ViewServerInterface } from '@penumbra-zone/types/servers';
export declare const BLANK_TX_SOURCE: CommitmentSource;
export declare const getCommitmentsFromActions: (tx: Transaction) => StateCommitment[];
export declare const getNullifiersFromActions: (tx: Transaction) => Nullifier[];
export interface RelevantTx {
    id: TransactionId;
    data: Transaction;
}
type RecoveredSourceRecords = (SpendableNoteRecord | SwapRecord)[];
export declare const identifyTransactions: (spentNullifiers: Set<Nullifier>, commitmentRecords: Map<StateCommitment, SpendableNoteRecord | SwapRecord>, blockTx: Transaction[], isControlledAddr: ViewServerInterface["isControlledAddress"]) => Promise<{
    relevantTxs: RelevantTx[];
    recoveredSourceRecords: RecoveredSourceRecords;
}>;
export {};
//# sourceMappingURL=identify-txs.d.ts.map