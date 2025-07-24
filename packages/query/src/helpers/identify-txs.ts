import {
  CommitmentSource,
  Nullifier,
} from '@penumbra-zone/protobuf/penumbra/core/component/sct/v1/sct_pb';
import { StateCommitment } from '@penumbra-zone/protobuf/penumbra/crypto/tct/v1/tct_pb';
import { SpendableNoteRecord, SwapRecord } from '@penumbra-zone/protobuf/penumbra/view/v1/view_pb';
import { Transaction } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { TransactionId } from '@penumbra-zone/protobuf/penumbra/core/txhash/v1/txhash_pb';
import {
  MsgAcknowledgement,
  MsgRecvPacket,
  MsgTimeout,
} from '@penumbra-zone/protobuf/ibc/core/channel/v1/tx_pb';
import { FungibleTokenPacketData } from '@penumbra-zone/protobuf/penumbra/core/component/ibc/v1/ibc_pb';
import { ViewServerInterface } from '@penumbra-zone/types/servers';
import { parseIntoAddr } from '@penumbra-zone/types/address';
import { Packet } from '@penumbra-zone/protobuf/ibc/core/channel/v1/channel_pb';
import { AddressIndex } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';

export const BLANK_TX_SOURCE = new CommitmentSource({
  source: { case: 'transaction', value: { id: new Uint8Array() } },
});

/**
 * Identifies if a tx has a relay action of which the receiver is the user.
 *
 * In terms of minting notes in the shielded pool, three IBC actions are relevant:
 * - MsgRecvPacket (containing an ICS20 inbound transfer)
 * - MsgAcknowledgement (containing an error acknowledgement, thus triggering a refund on our end)
 * - MsgTimeout
 */
const hasRelevantIbcRelay = (
  tx: Transaction,
  isControlledAddr: ViewServerInterface['isControlledAddress'],
): boolean => {
  return (
    tx.body?.actions.some(action => {
      if (action.action.case !== 'ibcRelayAction') {
        return false;
      }

      const rawAction = action.action.value.rawAction;
      if (!rawAction) {
        return false;
      }

      if (rawAction.is(MsgRecvPacket.typeName)) {
        const recvPacket = new MsgRecvPacket();
        rawAction.unpackTo(recvPacket);
        if (!recvPacket.packet) {
          return false;
        }
        return isControlledByUser(recvPacket.packet, isControlledAddr, 'receiver');
      }

      if (rawAction.is(MsgAcknowledgement.typeName)) {
        const ackPacket = new MsgAcknowledgement();
        rawAction.unpackTo(ackPacket);
        if (!ackPacket.packet) {
          return false;
        }
        return isControlledByUser(ackPacket.packet, isControlledAddr, 'sender');
      }

      if (rawAction.is(MsgTimeout.typeName)) {
        const timeout = new MsgTimeout();
        rawAction.unpackTo(timeout);
        if (!timeout.packet) {
          return false;
        }
        return isControlledByUser(timeout.packet, isControlledAddr, 'sender');
      }

      // Not a potentially relevant ibc relay action
      return false;
    }) ?? false
  );
};

// Determines if the packet data points to the user as the receiver
const isControlledByUser = (
  packet: Packet,
  isControlledAddr: ViewServerInterface['isControlledAddress'],
  entityToCheck: 'sender' | 'receiver',
): boolean => {
  try {
    const dataString = new TextDecoder().decode(packet.data);
    const { sender, receiver } = FungibleTokenPacketData.fromJsonString(dataString);
    const addrStr = entityToCheck === 'sender' ? sender : receiver;
    const addrToCheck = parseIntoAddr(addrStr);
    return isControlledAddr(addrToCheck);
  } catch {
    return false;
  }
};

// Used as a type-check helper as .filter(Boolean) still results with undefined as a possible value
const isDefined = <T>(value: T | null | undefined): value is NonNullable<T> =>
  value !== null && value !== undefined;

export const getCommitmentsFromActions = (tx: Transaction): StateCommitment[] => {
  if (!tx.body?.actions) {
    return [];
  }

  return tx.body.actions
    .flatMap(({ action }) => {
      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- TODO: Fix eslint issue
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

export const getNullifiersFromActions = (tx: Transaction): Nullifier[] => {
  if (!tx.body?.actions) {
    return [];
  }

  return tx.body.actions
    .flatMap(({ action }) => {
      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- TODO: Fix eslint issue
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

export interface RelevantTx {
  id: TransactionId;
  data: Transaction;
  subaccount?: AddressIndex;
}

type RecoveredSourceRecords = (SpendableNoteRecord | SwapRecord)[];

const generateTxId = async (tx: Transaction): Promise<TransactionId> => {
  return new TransactionId({
    inner: new Uint8Array(await crypto.subtle.digest('SHA-256', tx.toBinary())),
  });
};

const isSpendableNoteRecord = (
  note: SpendableNoteRecord | SwapRecord,
): note is SpendableNoteRecord => {
  return note.getType().typeName === SpendableNoteRecord.typeName;
};
const getAddressIndexFromNote = (
  note: SpendableNoteRecord | SwapRecord,
): AddressIndex | undefined => {
  if (isSpendableNoteRecord(note)) {
    return note.addressIndex;
  }
  return undefined;
};

/**
 * Takes a transaction and compares its actions to previously-found nullifiers and state commitments,
 * which point to SpendableNoteRecords and SwapRecords. If matches, creates txId and tries to get a subaccount.
 */
const searchRelevant = async (
  tx: Transaction,
  spentNullifiers: Map<Nullifier, SpendableNoteRecord | SwapRecord>,
  commitmentRecords: Map<StateCommitment, SpendableNoteRecord | SwapRecord>,
  isControlledAddr: ViewServerInterface['isControlledAddress'],
): Promise<
  { relevantTx: RelevantTx; recoveredSourceRecords: RecoveredSourceRecords } | undefined
> => {
  let txId: TransactionId | undefined;
  let subaccount: AddressIndex | undefined;
  const recoveredSourceRecords: RecoveredSourceRecords = [];

  // we need to identify which transaction is specifically relevant to the user. We check,
  // known nullifiers and state commitments that we knew were ours. Recall that we maintain
  // a mapping between nullifiers and state commitments to their associated SpendableNoteRecords and SwapRecords.
  // We compared these known nullifiers and state commitments against those embedded in transaction actions,
  // then rehydrated the relevant transaction sources for the SNRs and returned the relevant transaction.
  //
  // We checked nullifiers in [spend, swapClaim] actions and state commitments in [output, swap, swapClaim] actions.
  // However, if you inspect the intersection of these actions, you'll notice that spends will always be associated
  // with outputs (expect for spend), and swapClaims contain both nullifiers and commitments. Therefore, we don't need
  // to check nullifiers? But in fact, we need nullifiers because what if for instance we sent our entire balance to
  // another external account, which will only produce spends (and not outputs) relevent to us.
  //
  // We only need to rehydrate the transaction sources for SNRs, as the other source variants (eg. LQT) are already populated.

  // matches spend/swapClaim transaction actions with nullifiers
  const txNullifiers = getNullifiersFromActions(tx);
  for (const [spentNullifier, spendableNoteRecord] of spentNullifiers) {
    const nullifier = txNullifiers.find(txNullifier => spentNullifier.equals(txNullifier));
    if (nullifier) {
      txId ??= await generateTxId(tx);
      subaccount = getAddressIndexFromNote(spendableNoteRecord);
    }
  }

  // matches transaction actions [output, swap, swapClaim] with state commitments
  const txCommitments = getCommitmentsFromActions(tx);
  for (const [stateCommitment, spendableNoteRecord] of commitmentRecords) {
    if (txCommitments.some(txCommitment => stateCommitment.equals(txCommitment))) {
      // the nullish coalescing operator allows us to skip recomputation if the transaction
      // hash for the corresponding spendableNoteRecord has already been computed, as
      // all spendableNoteRecord's checked here are associated with the same transaction.
      txId ??= await generateTxId(tx);
      subaccount = getAddressIndexFromNote(spendableNoteRecord);

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

  // finds if either source or destination of an IBC relay action is controlled by the user
  if (hasRelevantIbcRelay(tx, isControlledAddr)) {
    txId ??= await generateTxId(tx);
  }

  // if set, that means this tx is relevant and should be returned to the caller
  if (txId) {
    return {
      relevantTx: { id: txId, data: tx, subaccount },
      recoveredSourceRecords,
    };
  }

  return undefined;
};

/**
 * Identifies transactions relevant to a user by comparing nullifiers and state commitments.
 * Also returns records with recovered sources.
 */
export const identifyTransactions = async (
  spentNullifiers: Map<Nullifier, SpendableNoteRecord | SwapRecord>,
  commitmentRecords: Map<StateCommitment, SpendableNoteRecord | SwapRecord>,
  blockTx: Transaction[],
  isControlledAddr: ViewServerInterface['isControlledAddress'],
): Promise<{
  relevantTxs: RelevantTx[];
  recoveredSourceRecords: RecoveredSourceRecords;
}> => {
  const relevantTxs: RelevantTx[] = [];
  const recoveredSourceRecords: RecoveredSourceRecords = [];

  const searchPromises = blockTx.map(tx =>
    searchRelevant(tx, spentNullifiers, commitmentRecords, isControlledAddr),
  );
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
