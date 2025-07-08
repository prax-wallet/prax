import { toPlainMessage, type PlainMessage } from '@bufbuild/protobuf';
import {
  FullViewingKey,
  SpendKey,
  WalletId,
} from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { TransactionPlan } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { generateSpendKey, getFullViewingKey, getWalletId } from '@penumbra-zone/wasm/keys';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Box } from '../encryption/box';
import { Key } from '../encryption/key';
import { sessionExtStorage } from '../session';
import impls, { CustodyImplJson, CustodyImplName, CustodyImplParam } from './custody/impls';
import { Wallet, WalletJson } from './wallet';
import { CustodyInstance } from './custody/types';
import { getCustodyImplByName } from './custody';

const seedPhrase =
  'benefit cherry cannon tooth exhibit law avocado spare tooth that amount pumpkin scene foil tape mobile shine apology add crouch situate sun business explain';
const spendKey = generateSpendKey(seedPhrase);
const fvk = getFullViewingKey(spendKey);
const walletId = getWalletId(fvk);

const sessionMock = (chrome.storage.session as unknown as { mock: Map<string, unknown> }).mock;

const implNames = Object.keys(impls) as CustodyImplName[];

const { key } = await Key.create('s0meUs3rP@ssword');
const mockWalletId = toPlainMessage(walletId);
const mockFullViewingKey = toPlainMessage(fvk);
const mockSeedPhraseBox: Box = await key.seal(seedPhrase);
const mockSpendKeyBox: Box = await key.seal(new SpendKey(spendKey).toJsonString());

const mockBoxes = {
  encryptedSeedPhrase: mockSeedPhraseBox,
  encryptedSpendKey: mockSpendKeyBox,
} as const;

describe('Wallet', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe.each(implNames)('constructor with %s custody', custodyType => {
    test('should create wallet with custody instance', () => {
      const impl = getCustodyImplByName(custodyType);
      const custodyInstance = new impl(mockBoxes[custodyType]) as CustodyInstance<
        typeof custodyType,
        CustodyImplJson[typeof custodyType]
      >;
      const wallet = new Wallet<typeof custodyType>(
        'Test Wallet',
        mockWalletId,
        mockFullViewingKey,
        custodyInstance,
      );

      expect(wallet.custodyType).toBe(custodyType);
      expect(wallet.custody).toBeInstanceOf(impl);
    });

    test('should create wallet with custody parameters', () => {
      const custodyImplParam: CustodyImplParam[typeof custodyType] = mockBoxes[custodyType];
      const impl = getCustodyImplByName(custodyType);
      const custodyParam = { [custodyType]: custodyImplParam } as Record<
        typeof custodyType,
        CustodyImplParam[typeof custodyType]
      >;
      const wallet = new Wallet<typeof custodyType>(
        'Test Wallet',
        mockWalletId,
        mockFullViewingKey,
        custodyParam,
      );

      expect(wallet.custodyType).toBe(custodyType);
      expect(wallet.custody).toBeInstanceOf(impl);
    });
  });

  describe('constructor error handling', () => {
    test('should throw error for invalid custody', () => {
      const invalidCustody = {
        encryptedSeedPhrase: 'test-seed',
        encryptedSpendKey: 'test-key',
      };

      expect(() => {
        new Wallet('Test Wallet', mockWalletId, mockFullViewingKey, invalidCustody as never);
      }).toThrow('Invalid custody');
    });

    test('should throw error for empty custody object', () => {
      expect(() => {
        new Wallet('Test Wallet', mockWalletId, mockFullViewingKey, {} as never);
      }).toThrow('Invalid custody');
    });

    test('should handle custody parameter with unknown custody type', () => {
      const unknownCustody = { unfamiliar: 'value' };
      expect(
        () => new Wallet('Test Wallet', mockWalletId, mockFullViewingKey, unknownCustody as never),
      ).toThrow('Unknown custody type');
    });
  });

  describe.each(implNames)('serialization with %s custody', custodyType => {
    test('should create wallet from JSON', () => {
      const custodyJson: CustodyImplJson[typeof custodyType] = mockBoxes[custodyType].toJson();
      const impl = getCustodyImplByName(custodyType);
      const walletJson: WalletJson<typeof custodyType> = {
        id: new WalletId(mockWalletId).toJsonString(),
        label: 'Test Wallet',
        fullViewingKey: new FullViewingKey(mockFullViewingKey).toJsonString(),
        custody: { [custodyType]: custodyJson } as Record<
          typeof custodyType,
          CustodyImplJson[typeof custodyType]
        >,
      };

      const wallet = Wallet.fromJson(walletJson);

      expect(wallet.label).toBe('Test Wallet');
      expect(wallet.custodyType).toBe(custodyType);
      expect(wallet.custody).toBeInstanceOf(impl);
    });
  });

  describe('serialization error handling', () => {
    const validJson = {
      id: new WalletId(mockWalletId).toJsonString(),
      label: 'Test Wallet',
      fullViewingKey: new FullViewingKey(mockFullViewingKey).toJsonString(),
      custody: { encryptedSeedPhrase: mockSeedPhraseBox.toJson() },
    };

    test('should handle invalid WalletId json', () => {
      const invalidJson = { ...validJson, id: validJson.id.replace('inner', 'outer') };

      expect(() => Wallet.fromJson(invalidJson)).toThrow(
        'cannot decode message penumbra.core.keys.v1.WalletId',
      );
    });

    test('should handle invalid FullViewingKey json', () => {
      const invalidJson = {
        ...validJson,
        fullViewingKey: validJson.fullViewingKey.replace('inner', 'under'),
      };

      expect(() => Wallet.fromJson(invalidJson)).toThrow(
        'cannot decode message penumbra.core.keys.v1.FullViewingKey',
      );
    });

    test('should handle invalid custody json', () => {
      const invalidJson = {
        ...validJson,
        custody: { encryptedSpendKey: new SpendKey({ inner: new Uint8Array(10) }).toJson() },
      };

      expect(() => Wallet.fromJson(invalidJson as never)).toThrow(
        'The string to be decoded is not correctly encoded',
      );
    });
  });

  describe.each(implNames)('JSON serialization with %s custody', custodyType => {
    test('should round-trip wallet through JSON', () => {
      const expectedCustody: CustodyImplJson[typeof custodyType] = mockBoxes[custodyType].toJson();
      const impl = getCustodyImplByName(custodyType);
      const custodyInstance = new impl(mockBoxes[custodyType]) as CustodyInstance<
        typeof custodyType,
        CustodyImplJson[typeof custodyType]
      >;
      const originalWallet = new Wallet<typeof custodyType>(
        'Test Wallet',
        mockWalletId,
        mockFullViewingKey,
        custodyInstance,
      );

      const json = originalWallet.toJson();
      const deserializedWallet = Wallet.fromJson(json);

      expect(json.label).toBe('Test Wallet');
      expect(json.custody).toMatchObject({ [custodyType]: expectedCustody });
      expect(deserializedWallet.label).toBe(originalWallet.label);
      expect(deserializedWallet.custodyType).toBe(custodyType);
      expect(deserializedWallet.custody).toBeInstanceOf(impl);
    });
  });

  describe.each(implNames)('authorization', custodyType => {
    let authBoxes: Record<CustodyImplName, Box>;
    let mockTransactionPlan: PlainMessage<TransactionPlan>;

    beforeEach(async () => {
      sessionMock.clear();
      mockTransactionPlan = toPlainMessage(testTxPlanData);

      const { key: authKey } = await Key.create('authTestPassword');
      authBoxes = {
        encryptedSeedPhrase: await authKey.seal(seedPhrase),
        encryptedSpendKey: await authKey.seal(new SpendKey(spendKey).toJsonString()),
      };
      await sessionExtStorage.set('passwordKey', await authKey.toJson());
    });

    test('should authorize transaction with custody', async () => {
      const impl = getCustodyImplByName(custodyType);
      const custodyInstance = new impl(authBoxes[custodyType]) as CustodyInstance<
        typeof custodyType,
        CustodyImplJson[typeof custodyType]
      >;
      const wallet = new Wallet<typeof custodyType>(
        'Test Wallet',
        mockWalletId,
        mockFullViewingKey,
        custodyInstance,
      );

      const authData = await wallet.custody.authorize(mockWalletId, mockTransactionPlan);

      expect(authData).toBeDefined();
      expect(authData.spendAuths).toBeDefined();
      expect(authData.delegatorVoteAuths).toBeDefined();
    });

    test('should throw error when authorizing with wrong wallet ID', async () => {
      const differentSpendKey = generateSpendKey(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
      );
      const differentFvk = getFullViewingKey(differentSpendKey);
      const differentWalletId = getWalletId(differentFvk);

      const impl = getCustodyImplByName(custodyType);
      const custodyInstance = new impl(authBoxes[custodyType]) as CustodyInstance<
        typeof custodyType,
        CustodyImplJson[typeof custodyType]
      >;
      const wallet = new Wallet<typeof custodyType>(
        'Test Wallet',
        mockWalletId,
        mockFullViewingKey,
        custodyInstance,
      );

      await expect(
        wallet.custody.authorize(toPlainMessage(differentWalletId), mockTransactionPlan),
      ).rejects.toThrow('Wrong wallet');
    });

    test('should throw error when no session password is available', async () => {
      sessionMock.clear();

      const impl = getCustodyImplByName(custodyType);
      const custodyInstance = new impl(authBoxes[custodyType]) as CustodyInstance<
        typeof custodyType,
        CustodyImplJson[typeof custodyType]
      >;
      const wallet = new Wallet<typeof custodyType>(
        'Test Wallet',
        mockWalletId,
        mockFullViewingKey,
        custodyInstance,
      );

      await expect(wallet.custody.authorize(mockWalletId, mockTransactionPlan)).rejects.toThrow(
        'No session password',
      );
    });

    test('should throw error when the session password is incorrect', async () => {
      const { key: authKey } = await Key.create('wrongPassword');
      await sessionExtStorage.set('passwordKey', await authKey.toJson());

      const impl = getCustodyImplByName(custodyType);
      const custodyInstance = new impl(authBoxes[custodyType]) as CustodyInstance<
        typeof custodyType,
        CustodyImplJson[typeof custodyType]
      >;
      const wallet = new Wallet<typeof custodyType>(
        'Test Wallet',
        mockWalletId,
        mockFullViewingKey,
        custodyInstance,
      );

      await expect(wallet.custody.authorize(mockWalletId, mockTransactionPlan)).rejects.toThrow(
        'Unable to decrypt',
      );
    });
  });
});

const testTxPlanData = TransactionPlan.fromJson({
  actions: [
    {
      output: {
        value: {
          amount: {
            lo: '2000000',
          },
          assetId: {
            inner: 'KeqcLzNx9qSH5+lcJHBB9KNW+YPrBk5dKzvPMiypahA=',
          },
        },
        destAddress: {
          inner:
            '0AI1VPl2Z2iM62nnBX+o00kL3Fcvcqm8zgp0ErDpw4hT2syB5TeaGJM8B+5KV+/3CS78toGM3WleoNgPh/7L9bKNOrmq7UEqBmfAb7MDI+w=',
        },
        rseed: 'BULXqsGKMksW5MfrJAuWWWaEHJw36avj90y+/TzDspk=',
        valueBlinding: 'DMAmhhWllwK84CFBGY5OPkkCLP1pRNhyK0OzotdAnwE=',
        proofBlindingR: 'doF1SnSllGyEqWWsmEIiHlCnDG9M083qjeyFNHW9agc=',
        proofBlindingS: 'uRcVB0ZoUWPDrNA0wfznHJ6Wfn3usDCgazIDkLmZIQE=',
      },
    },
    {
      spend: {
        note: {
          value: {
            amount: {
              lo: '999970000000',
            },
            assetId: {
              inner: 'KeqcLzNx9qSH5+lcJHBB9KNW+YPrBk5dKzvPMiypahA=',
            },
          },
          rseed: 's8BBrPg6NNLttLZfg7Ban2LOyqyt3IxpBFK9MmpHvKQ=',
          address: {
            inner:
              'H54tVYCe2KONaws0+4Qt8jHSup2InYWauNEGtLa7+yQ8ssaP1Qc2bjsB7uyfQl3QKMXzfm3u70/CbK9tOiSXjDtDzx3AtQw2wKCeuht3Ono=',
          },
        },
        position: '34395652097',
        randomizer: '6cyFYGqAzvV4mMwsmZBAwELPUv1ZGFcY8f+X07zgtgI=',
        valueBlinding: '7EMBCEOyvPGDAuqRqivIdVVPgIV2NCLwin3n5pQqXgA=',
        proofBlindingR: '5lN3tTp7HwVcMwftb/YPIv5zfVP6CdmjlCEjQcPzGQo=',
        proofBlindingS: 'JFvqR0FInc0EqgmnhZmUVbsbnxz6dKoSkgheGAjZYQI=',
      },
    },
    {
      output: {
        value: {
          amount: {
            lo: '999968000000',
          },
          assetId: {
            inner: 'KeqcLzNx9qSH5+lcJHBB9KNW+YPrBk5dKzvPMiypahA=',
          },
        },
        destAddress: {
          inner:
            'H54tVYCe2KONaws0+4Qt8jHSup2InYWauNEGtLa7+yQ8ssaP1Qc2bjsB7uyfQl3QKMXzfm3u70/CbK9tOiSXjDtDzx3AtQw2wKCeuht3Ono=',
        },
        rseed: 'gYyyrY8TsRvUNKIdP1YCpJp/Eu/s0e07zCtn7hN5GEU=',
        valueBlinding: 'X+GBy22M8nw96admaf73HSHfwQV6kY1h+hwtxyv43gM=',
        proofBlindingR: 'x8nvKsa9z4sLwwvPTsJPzeUGXjYc+io6jlj9sHCAIQ4=',
        proofBlindingS: 'cwonvYBvfGCke2uMZOCOqFXQ1xWGdQxmGmnUyRSa0wk=',
      },
    },
  ],
  transactionParameters: {
    chainId: 'penumbra-testnet-deimos-4-a9b11fc4',
    fee: {
      amount: {},
    },
  },
  detectionData: {
    cluePlans: [
      {
        address: {
          inner:
            '0AI1VPl2Z2iM62nnBX+o00kL3Fcvcqm8zgp0ErDpw4hT2syB5TeaGJM8B+5KV+/3CS78toGM3WleoNgPh/7L9bKNOrmq7UEqBmfAb7MDI+w=',
        },
        rseed: '2lahgt65yDWXPfLS/rvs8pdvLVQ8czd3XBYmJTIWsCg=',
      },
      {
        address: {
          inner:
            'H54tVYCe2KONaws0+4Qt8jHSup2InYWauNEGtLa7+yQ8ssaP1Qc2bjsB7uyfQl3QKMXzfm3u70/CbK9tOiSXjDtDzx3AtQw2wKCeuht3Ono=',
        },
        rseed: 'IG3MCsS8gtTOrqaOTWxkAKHAnFTgYEKsd9rsvsUuGFQ=',
      },
    ],
  },
  memo: {
    plaintext: {
      returnAddress: {
        inner:
          'H54tVYCe2KONaws0+4Qt8jHSup2InYWauNEGtLa7+yQ8ssaP1Qc2bjsB7uyfQl3QKMXzfm3u70/CbK9tOiSXjDtDzx3AtQw2wKCeuht3Ono=',
      },
      text: 'Authorize test',
    },
    key: 'oEBs1HP1bMgskLja5CAuFMpRM1Xw6IScIbBXJKzRJgc=',
  },
});
