import { CommitmentSource, } from '@penumbra-zone/protobuf/penumbra/core/component/sct/v1/sct_pb';
import { TransactionId } from '@penumbra-zone/protobuf/penumbra/core/txhash/v1/txhash_pb';
import { sha256Hash } from '@penumbra-zone/crypto-web/sha256';
import { MsgRecvPacket } from '@penumbra-zone/protobuf/ibc/core/channel/v1/tx_pb';
import { FungibleTokenPacketData } from '@penumbra-zone/protobuf/penumbra/core/component/ibc/v1/ibc_pb';
import { parseIntoAddr } from '@penumbra-zone/types/address';
export const BLANK_TX_SOURCE = new CommitmentSource({
    source: { case: 'transaction', value: { id: new Uint8Array() } },
});
// Identifies if a tx with a relay action of which the receiver is the user
const hasRelevantIbcRelay = (tx, isControlledAddr) => {
    return tx.body?.actions.some(action => {
        if (action.action.case !== 'ibcRelayAction') {
            return false;
        }
        if (!action.action.value.rawAction?.is(MsgRecvPacket.typeName)) {
            return false;
        }
        const recvPacket = new MsgRecvPacket();
        const success = action.action.value.rawAction.unpackTo(recvPacket);
        if (!success) {
            throw new Error('Error while trying to unpack Any to MsgRecvPacket');
        }
        if (!recvPacket.packet?.data) {
            throw new Error('No FungibleTokenPacketData MsgRecvPacket');
        }
        try {
            const dataString = new TextDecoder().decode(recvPacket.packet.data);
            const { receiver } = FungibleTokenPacketData.fromJsonString(dataString);
            const receivingAddr = parseIntoAddr(receiver);
            return isControlledAddr(receivingAddr);
        }
        catch (e) {
            return false;
        }
    });
};
// Used as a type-check helper as .filter(Boolean) still results with undefined as a possible value
const isDefined = (value) => value !== null && value !== undefined;
export const getCommitmentsFromActions = (tx) => {
    if (!tx.body?.actions) {
        return [];
    }
    return tx.body.actions
        .flatMap(({ action }) => {
        switch (action.case) {
            case 'output':
                return action.value.body?.notePayload?.noteCommitment;
            case 'swap':
                return action.value.body?.payload?.commitment;
            case 'swapClaim':
                return [action.value.body?.output1Commitment, action.value.body?.output2Commitment];
            default:
                return;
        }
    })
        .filter(isDefined);
};
export const getNullifiersFromActions = (tx) => {
    if (!tx.body?.actions) {
        return [];
    }
    return tx.body.actions
        .flatMap(({ action }) => {
        switch (action.case) {
            case 'spend':
            case 'swapClaim':
                return action.value.body?.nullifier;
            default:
                return;
        }
    })
        .filter(isDefined);
};
const generateTxId = async (tx) => {
    return new TransactionId({ inner: await sha256Hash(tx.toBinary()) });
};
const searchRelevant = async (tx, spentNullifiers, commitmentRecords, isControlledAddr) => {
    let txId; // If set, that means this tx is relevant and should be returned to the caller
    const recoveredSourceRecords = [];
    const txNullifiers = getNullifiersFromActions(tx);
    for (const spentNullifier of spentNullifiers) {
        if (txNullifiers.some(txNullifier => spentNullifier.equals(txNullifier))) {
            txId ??= await generateTxId(tx);
        }
    }
    const txCommitments = getCommitmentsFromActions(tx);
    for (const [stateCommitment, spendableNoteRecord] of commitmentRecords) {
        if (txCommitments.some(txCommitment => stateCommitment.equals(txCommitment))) {
            txId ??= await generateTxId(tx);
            // Blank sources can be recovered by associating them with the transaction
            if (BLANK_TX_SOURCE.equals(spendableNoteRecord.source)) {
                const recovered = spendableNoteRecord.clone();
                recovered.source = new CommitmentSource({
                    source: { case: 'transaction', value: { id: txId.inner } },
                });
                recoveredSourceRecords.push(recovered);
            }
        }
    }
    if (hasRelevantIbcRelay(tx, isControlledAddr)) {
        txId ??= await generateTxId(tx);
    }
    if (txId) {
        return {
            relevantTx: { id: txId, data: tx },
            recoveredSourceRecords,
        };
    }
    return undefined;
};
// identify transactions that involve a new record by comparing nullifiers and state commitments
// also returns records with recovered sources
export const identifyTransactions = async (spentNullifiers, commitmentRecords, blockTx, isControlledAddr) => {
    const relevantTxs = [];
    const recoveredSourceRecords = [];
    const searchPromises = blockTx.map(tx => searchRelevant(tx, spentNullifiers, commitmentRecords, isControlledAddr));
    const results = await Promise.all(searchPromises);
    for (const result of results) {
        if (result?.relevantTx) {
            relevantTxs.push(result.relevantTx);
        }
        if (result?.recoveredSourceRecords.length) {
            recoveredSourceRecords.push(...result.recoveredSourceRecords);
        }
    }
    return { relevantTxs, recoveredSourceRecords };
};
