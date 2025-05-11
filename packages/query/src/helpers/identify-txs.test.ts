import { describe, expect, test } from 'vitest';
import { Nullifier } from '@penumbra-zone/protobuf/penumbra/core/component/sct/v1/sct_pb';
import { StateCommitment } from '@penumbra-zone/protobuf/penumbra/crypto/tct/v1/tct_pb';
import {
  Action,
  Transaction,
  TransactionBody,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import {
  BLANK_TX_SOURCE,
  getCommitmentsFromActions,
  getNullifiersFromActions,
  identifyTransactions,
} from './identify-txs';
import {
  Output,
  OutputBody,
  Spend,
  SpendBody,
} from '@penumbra-zone/protobuf/penumbra/core/component/shielded_pool/v1/shielded_pool_pb';
import {
  Swap,
  SwapBody,
  SwapClaim,
  SwapClaimBody,
} from '@penumbra-zone/protobuf/penumbra/core/component/dex/v1/dex_pb';
import { SpendableNoteRecord, SwapRecord } from '@penumbra-zone/protobuf/penumbra/view/v1/view_pb';
import { Any } from '@bufbuild/protobuf';
import {
  FungibleTokenPacketData,
  IbcRelay,
} from '@penumbra-zone/protobuf/penumbra/core/component/ibc/v1/ibc_pb';
import { addressFromBech32m } from '@penumbra-zone/bech32m/penumbra';
import { Address, AddressIndex } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { Packet } from '@penumbra-zone/protobuf/ibc/core/channel/v1/channel_pb';
import {
  MsgAcknowledgement,
  MsgRecvPacket,
  MsgTimeout,
} from '@penumbra-zone/protobuf/ibc/core/channel/v1/tx_pb';

describe('getCommitmentsFromActions', () => {
  test('returns empty array when tx.body.actions is undefined', () => {
    const tx = new Transaction();
    const commitments = getCommitmentsFromActions(tx);
    expect(commitments).toEqual([]);
  });

  test('returns noteCommitment from output actions', () => {
    const noteCommitment = new StateCommitment({ inner: new Uint8Array([1, 2, 3]) });
    const outputAction = new Action({
      action: {
        case: 'output',
        value: new Output({
          body: new OutputBody({
            notePayload: {
              noteCommitment,
            },
          }),
        }),
      },
    });

    const tx = new Transaction({
      body: new TransactionBody({
        actions: [outputAction],
      }),
    });

    const commitments = getCommitmentsFromActions(tx);
    expect(commitments).toEqual([noteCommitment]);
  });

  test('returns commitment from swap actions', () => {
    const commitment = new StateCommitment({ inner: new Uint8Array([4, 5, 6]) });
    const swapAction = new Action({
      action: {
        case: 'swap',
        value: new Swap({
          body: new SwapBody({
            payload: {
              commitment,
            },
          }),
        }),
      },
    });

    const tx = new Transaction({
      body: new TransactionBody({
        actions: [swapAction],
      }),
    });

    const commitments = getCommitmentsFromActions(tx);
    expect(commitments).toEqual([commitment]);
  });

  test('returns output commitments from swapClaim actions', () => {
    const output1Commitment = new StateCommitment({ inner: new Uint8Array([7, 8, 9]) });
    const output2Commitment = new StateCommitment({ inner: new Uint8Array([10, 11, 12]) });

    const swapClaimAction = new Action({
      action: {
        case: 'swapClaim',
        value: new SwapClaim({
          body: new SwapClaimBody({
            output1Commitment,
            output2Commitment,
          }),
        }),
      },
    });

    const tx = new Transaction({
      body: new TransactionBody({
        actions: [swapClaimAction],
      }),
    });

    const commitments = getCommitmentsFromActions(tx);
    expect(commitments).toEqual([output1Commitment, output2Commitment]);
  });

  test('ignores actions without commitments', () => {
    const unknownAction = new Action({
      action: {
        case: 'validatorDefinition',
        value: {},
      },
    });

    const tx = new Transaction({
      body: new TransactionBody({
        actions: [unknownAction],
      }),
    });

    const commitments = getCommitmentsFromActions(tx);
    expect(commitments).toEqual([]);
  });
});

describe('getNullifiersFromActions', () => {
  test('returns empty array when tx.body.actions is undefined', () => {
    const tx = new Transaction();
    const nullifiers = getNullifiersFromActions(tx);
    expect(nullifiers).toEqual([]);
  });

  test('returns nullifier from spend actions', () => {
    const nullifier = new Nullifier({ inner: new Uint8Array([1, 2, 3]) });
    const spendAction = new Action({
      action: {
        case: 'spend',
        value: new Spend({
          body: new SpendBody({
            nullifier,
          }),
        }),
      },
    });

    const tx = new Transaction({
      body: new TransactionBody({
        actions: [spendAction],
      }),
    });

    const nullifiers = getNullifiersFromActions(tx);
    expect(nullifiers).toEqual([nullifier]);
  });

  test('returns nullifier from swapClaim actions', () => {
    const nullifier = new Nullifier({ inner: new Uint8Array([4, 5, 6]) });
    const swapClaimAction = new Action({
      action: {
        case: 'swapClaim',
        value: new SwapClaim({
          body: new SwapClaimBody({
            nullifier,
          }),
        }),
      },
    });

    const tx = new Transaction({
      body: new TransactionBody({
        actions: [swapClaimAction],
      }),
    });

    const nullifiers = getNullifiersFromActions(tx);
    expect(nullifiers).toEqual([nullifier]);
  });

  test('ignores actions without nullifiers', () => {
    const outputAction = new Action({
      action: {
        case: 'output',
        value: new Output(),
      },
    });

    const tx = new Transaction({
      body: new TransactionBody({
        actions: [outputAction],
      }),
    });

    const nullifiers = getNullifiersFromActions(tx);
    expect(nullifiers).toEqual([]);
  });
});

describe('identifyTransactions', () => {
  const MAIN_ACCOUNT = new AddressIndex({ account: 0 });

  test('returns empty arrays when no relevant transactions are found', async () => {
    const tx = new Transaction();
    const blockTx = [tx];
    const spentNullifiers = new Map<Nullifier, SpendableNoteRecord | SwapRecord>();
    const commitmentRecords = new Map<StateCommitment, SpendableNoteRecord | SwapRecord>();

    const result = await identifyTransactions(
      spentNullifiers,
      commitmentRecords,
      blockTx,
      () => false,
    );

    expect(result.relevantTxs).toEqual([]);
    expect(result.recoveredSourceRecords).toEqual([]);
  });

  test('identifies relevant transactions by nullifiers', async () => {
    // Relevant nullifier
    const nullifier = new Nullifier({ inner: new Uint8Array([1, 2, 3]) });
    const tx1 = new Transaction({
      body: new TransactionBody({
        actions: [
          new Action({
            action: {
              case: 'spend',
              value: new Spend({
                body: new SpendBody({
                  nullifier,
                }),
              }),
            },
          }),
        ],
      }),
    });

    // Irrelevant nullifier
    const tx2 = new Transaction({
      body: new TransactionBody({
        actions: [
          new Action({
            action: {
              case: 'spend',
              value: new Spend({
                body: new SpendBody({
                  nullifier: new Nullifier({ inner: new Uint8Array([4, 5, 6]) }),
                }),
              }),
            },
          }),
        ],
      }),
    });

    const spendableNoteRecord = new SpendableNoteRecord({
      addressIndex: MAIN_ACCOUNT,
      source: BLANK_TX_SOURCE,
    });

    const spentNullifiers = new Map<Nullifier, SpendableNoteRecord | SwapRecord>([
      [nullifier, spendableNoteRecord],
    ]);
    const commitmentRecords = new Map<StateCommitment, SpendableNoteRecord | SwapRecord>();

    const result = await identifyTransactions(
      spentNullifiers,
      commitmentRecords,
      [
        tx1, // relevant
        tx2, // irrelevant
      ],
      () => false,
    );

    expect(result.relevantTxs.length).toBe(1);
    expect(result.relevantTxs[0]?.data.equals(tx1)).toBeTruthy();
    expect(result.relevantTxs[0]?.subaccount?.equals(MAIN_ACCOUNT)).toBeTruthy();
  });

  test('identifies relevant transactions by commitments and recovers sources', async () => {
    // Matching commitment
    const commitment = new StateCommitment({ inner: new Uint8Array([4, 5, 6]) });
    const tx1 = new Transaction({
      body: new TransactionBody({
        actions: [
          new Action({
            action: {
              case: 'output',
              value: new Output({
                body: new OutputBody({
                  notePayload: {
                    noteCommitment: commitment,
                  },
                }),
              }),
            },
          }),
        ],
      }),
    });

    // Irrelevant commitment
    const tx2 = new Transaction({
      body: new TransactionBody({
        actions: [
          new Action({
            action: {
              case: 'output',
              value: new Output({
                body: new OutputBody({
                  notePayload: {
                    noteCommitment: new StateCommitment({ inner: new Uint8Array([7, 8, 9]) }),
                  },
                }),
              }),
            },
          }),
        ],
      }),
    });

    const spendableNoteRecord = new SpendableNoteRecord({
      addressIndex: MAIN_ACCOUNT,
      source: BLANK_TX_SOURCE,
    });

    const commitmentRecords = new Map<StateCommitment, SpendableNoteRecord | SwapRecord>([
      [commitment, spendableNoteRecord], // Expecting match
      [new StateCommitment({ inner: new Uint8Array([1, 6, 9]) }), new SpendableNoteRecord()], // not expecting match
    ]);
    const spentNullifiers = new Map<Nullifier, SpendableNoteRecord | SwapRecord>();

    const spentNullifiersBeforeSize = spentNullifiers.size;
    const commitmentRecordsBeforeSize = commitmentRecords.size;
    const result = await identifyTransactions(
      spentNullifiers,
      commitmentRecords,
      [
        tx1, // relevant
        tx2, // not
      ],
      () => false,
    );

    expect(result.relevantTxs.length).toBe(1);
    expect(result.recoveredSourceRecords.length).toBe(1);
    expect(result.relevantTxs[0]?.data.equals(tx1)).toBeTruthy();
    expect(result.relevantTxs[0]?.subaccount?.equals(MAIN_ACCOUNT)).toBeTruthy();

    // Source was recovered
    expect(result.recoveredSourceRecords[0]!.source?.equals(BLANK_TX_SOURCE)).toEqual(false);

    // Expect inputs where not mutated
    expect(spentNullifiersBeforeSize).toEqual(spentNullifiers.size);
    expect(commitmentRecordsBeforeSize).toEqual(commitmentRecords.size);
  });

  describe('ibc relays', () => {
    const knownAddr =
      'penumbra1e8k5cyds484dxvapeamwveh5khqv4jsvyvaf5wwxaaccgfghm229qw03pcar3ryy8smptevstycch0qk3uu0rgkvtjpxy3cu3rjd0agawqtlz6erev28a6sg69u7cxy0t02nd4';
    const unknownAddr =
      'penumbracompat1147mfall0zr6am5r45qkwht7xqqrdsp50czde7empv7yq2nk3z8yyfh9k9520ddgswkmzar22vhz9dwtuem7uxw0qytfpv7lk3q9dp8ccaw2fn5c838rfackazmgf3ahhwqq0da';
    const isControlledByAddress = (addr: Address) =>
      addr.equals(new Address(addressFromBech32m(knownAddr)));

    test('identifies relevant MsgRecvPacket', async () => {
      const txA = new Transaction({
        body: {
          actions: [createMsgReceive(knownAddr), createMsgReceive(unknownAddr)],
        },
      });
      const txB = new Transaction({
        body: {
          actions: [createMsgReceive(unknownAddr)],
        },
      });
      const blockTx = [txA, txB];
      const spentNullifiers = new Map<Nullifier, SpendableNoteRecord | SwapRecord>();
      const commitmentRecords = new Map<StateCommitment, SpendableNoteRecord | SwapRecord>();

      const result = await identifyTransactions(
        spentNullifiers,
        commitmentRecords,
        blockTx,
        isControlledByAddress,
      );

      expect(result.relevantTxs.length).toBe(1);
      expect(result.relevantTxs[0]?.data.equals(txA)).toBeTruthy();
      expect(result.recoveredSourceRecords.length).toBe(0);
    });

    test('identifies relevant MsgAcknowledgement', async () => {
      const txA = new Transaction({
        body: {
          actions: [createMsgAcknowledgement(knownAddr), createMsgAcknowledgement(unknownAddr)],
        },
      });
      const txB = new Transaction({
        body: {
          actions: [createMsgAcknowledgement(unknownAddr)],
        },
      });
      const blockTx = [txA, txB];
      const spentNullifiers = new Map<Nullifier, SpendableNoteRecord | SwapRecord>();
      const commitmentRecords = new Map<StateCommitment, SpendableNoteRecord | SwapRecord>();

      const result = await identifyTransactions(
        spentNullifiers,
        commitmentRecords,
        blockTx,
        isControlledByAddress,
      );

      expect(result.relevantTxs.length).toBe(1);
      expect(result.relevantTxs[0]?.data.equals(txA)).toBeTruthy();
      expect(result.recoveredSourceRecords.length).toBe(0);
    });

    test('identifies relevant MsgTimeout', async () => {
      const txA = new Transaction({
        body: {
          actions: [createMsgTimeout(knownAddr), createMsgTimeout(unknownAddr)],
        },
      });
      const txB = new Transaction({
        body: {
          actions: [createMsgTimeout(unknownAddr)],
        },
      });
      const blockTx = [txA, txB];
      const spentNullifiers = new Map<Nullifier, SpendableNoteRecord | SwapRecord>();
      const commitmentRecords = new Map<StateCommitment, SpendableNoteRecord | SwapRecord>();

      const result = await identifyTransactions(
        spentNullifiers,
        commitmentRecords,
        blockTx,
        isControlledByAddress,
      );

      expect(result.relevantTxs.length).toBe(1);
      expect(result.relevantTxs[0]?.data.equals(txA)).toBeTruthy();
      expect(result.recoveredSourceRecords.length).toBe(0);
    });

    test('ignores irrelevant ibc relays', async () => {
      const tx = new Transaction({
        body: {
          actions: [
            createMsgReceive(unknownAddr),
            createMsgAcknowledgement(unknownAddr),
            createMsgTimeout(unknownAddr),
          ],
        },
      });
      const blockTx = [tx];
      const spentNullifiers = new Map<Nullifier, SpendableNoteRecord | SwapRecord>();
      const commitmentRecords = new Map<StateCommitment, SpendableNoteRecord | SwapRecord>();

      const result = await identifyTransactions(
        spentNullifiers,
        commitmentRecords,
        blockTx,
        isControlledByAddress,
      );

      expect(result.relevantTxs.length).toBe(0);
    });

    test('ignores errors if any unpack fails', async () => {
      const noAction = new Action({
        action: { case: 'ibcRelayAction', value: new IbcRelay({}) },
      });
      const noPacket = new Action({
        action: {
          case: 'ibcRelayAction',
          value: new IbcRelay({ rawAction: Any.pack(new MsgRecvPacket({})) }),
        },
      });
      const badDataPacket = new Action({
        action: {
          case: 'ibcRelayAction',
          value: new IbcRelay({
            rawAction: Any.pack(
              new MsgRecvPacket({
                packet: new Packet({ data: new Uint8Array([1, 2, 3, 4, 5, 6, 7]) }),
              }),
            ),
          }),
        },
      });
      const tx = new Transaction({
        body: {
          actions: [noAction, noPacket, badDataPacket],
        },
      });
      const blockTx = [tx];
      const spentNullifiers = new Map<Nullifier, SpendableNoteRecord | SwapRecord>();
      const commitmentRecords = new Map<StateCommitment, SpendableNoteRecord | SwapRecord>();

      const result = await identifyTransactions(
        spentNullifiers,
        commitmentRecords,
        blockTx,
        isControlledByAddress,
      );

      expect(result.relevantTxs.length).toBe(0);
    });
  });
});

const createMsgReceive = (receiver: string): Action => {
  const tokenPacketData = new FungibleTokenPacketData({ receiver });
  const encoder = new TextEncoder();
  const relevantRelay = Any.pack(
    new MsgRecvPacket({
      packet: new Packet({ data: encoder.encode(tokenPacketData.toJsonString()) }),
    }),
  );
  return new Action({
    action: { case: 'ibcRelayAction', value: new IbcRelay({ rawAction: relevantRelay }) },
  });
};

const createMsgAcknowledgement = (sender: string): Action => {
  const tokenPacketData = new FungibleTokenPacketData({ sender });
  const encoder = new TextEncoder();
  const relevantRelay = Any.pack(
    new MsgAcknowledgement({
      packet: new Packet({ data: encoder.encode(tokenPacketData.toJsonString()) }),
    }),
  );
  return new Action({
    action: { case: 'ibcRelayAction', value: new IbcRelay({ rawAction: relevantRelay }) },
  });
};

const createMsgTimeout = (sender: string): Action => {
  const tokenPacketData = new FungibleTokenPacketData({ sender });
  const encoder = new TextEncoder();
  const relevantRelay = Any.pack(
    new MsgTimeout({
      packet: new Packet({ data: encoder.encode(tokenPacketData.toJsonString()) }),
    }),
  );
  return new Action({
    action: { case: 'ibcRelayAction', value: new IbcRelay({ rawAction: relevantRelay }) },
  });
};
