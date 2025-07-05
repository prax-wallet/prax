import { toPlainMessage } from '@bufbuild/protobuf';
import { bech32mSpendKey } from '@penumbra-zone/bech32m/penumbraspendkey';
import {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { generateSpendKey, getFullViewingKey, getWalletId } from '@penumbra-zone/wasm/keys';
import { Key } from '@repo/encryption/key';
import { beforeAll, describe, expect, test } from 'vitest';
import { getCustodyImplByName } from './custody';
import { CustodyImplJson, CustodyImplName, CustodyImplParam } from './custody/impls';
import { CustodyInstance } from './custody/types';
import { Wallet, WalletJson } from './wallet';

const seedPhrase =
  'benefit cherry cannon tooth exhibit law avocado spare tooth that amount pumpkin scene foil tape mobile shine apology add crouch situate sun business explain';

const spendKey = generateSpendKey(seedPhrase);
const fvk = getFullViewingKey(spendKey);
const walletId = getWalletId(fvk);
const label = 'Test Wallet';
const { key: passKey } = await Key.create('s0meUs3rP@ssword');

const custodyParams: Record<CustodyImplName, CustodyImplParam[CustodyImplName]> = {
  encryptedSeedPhrase: await passKey.seal(seedPhrase),
  encryptedSpendKey: await passKey.seal(bech32mSpendKey(spendKey)),
} as const;

describe('Wallet with bad custody', () => {
  test('Wallet with unknown custody', () => {
    expect(() => {
      new Wallet(label, walletId, fvk, {
        unknownCustodyTypeName: 'value',
      } as never);
    }).toThrow('Unknown custody type');
  });

  test('Wallet with empty custody', () => {
    expect(() => {
      new Wallet(label, walletId, fvk, {} as never);
    }).toThrow('custody is not valid');
  });

  test('Wallet with undefined custody', () => {
    expect(() => {
      new Wallet(label, walletId, fvk, undefined as never);
    }).toThrow('Cannot convert undefined or null to object');
  });
});

describe.each(Object.keys(custodyParams) as CustodyImplName[])(
  'Wallet with %s custody',
  custodyType => {
    const impl = getCustodyImplByName(custodyType);
    const custodyParam = { [custodyType]: custodyParams[custodyType] } as Pick<
      typeof custodyParams,
      typeof custodyType
    >;
    const custodyInstance = new impl(custodyParams[custodyType]) as CustodyInstance<
      typeof custodyType,
      CustodyImplJson[typeof custodyType]
    >;

    describe('Wallet constructor', () => {
      test('constructed with valid custody data', () => {
        const wallet = new Wallet(label, walletId, fvk, custodyParam);

        expect(wallet.custodyType).toBe(custodyType);
        expect(wallet.custody).toBeInstanceOf(impl);
      });

      test('constructed with valid custody instance', () => {
        const wallet = new Wallet<typeof custodyType>(label, walletId, fvk, custodyInstance);
        expect(wallet.custodyType).toBe(custodyType);
        expect(wallet.custody).toBeInstanceOf(impl);
      });

      test('constructed with undefined label', () => {
        expect(() => {
          new Wallet(undefined as never, walletId, fvk, custodyParam);
        }).toThrow('label is not valid');
      });

      test('constructed with undefined wallet ID', () => {
        expect(() => {
          new Wallet(label, undefined as never, fvk, custodyParam);
        }).toThrow('id is not valid');
      });

      test('constructed with undefined full viewing key', () => {
        expect(() => {
          new Wallet(label, walletId, undefined as never, custodyParam);
        }).toThrow('full viewing key is not valid');
      });
    });

    describe('seralization', () => {
      const walletJson: WalletJson<typeof custodyType> = {
        id: walletId.toJson() as { inner: string },
        label: label,
        fullViewingKey: fvk.toJson() as { inner: string },
        custody: { [custodyType]: custodyParams[custodyType].toJson() } as Pick<
          CustodyImplJson,
          typeof custodyType
        >,
      };

      test('round-trip', () => {
        const deserialized = Wallet.fromJson(walletJson);

        expect(deserialized.label).toBe(walletJson.label);
        expect(deserialized.id).toStrictEqual(toPlainMessage(walletId));
        expect(deserialized.fullViewingKey).toStrictEqual(toPlainMessage(fvk));

        expect(deserialized.custodyType).toBe(Object.keys(walletJson.custody)[0]);
        expect(deserialized.custody).toBeInstanceOf(impl);

        expect(deserialized.toJson()).toStrictEqual(walletJson);
      });

      test.each(['id', 'label', 'fullViewingKey', 'custody'] as const)(
        `throws if %s is undefined`,
        walletField => {
          expect(() =>
            Wallet.fromJson({
              ...walletJson,
              [walletField]: undefined as never,
            }),
          ).toThrow();
        },
      );
    });

    describe('authorization', () => {
      const wallet = new Wallet(label, walletId, fvk, custodyParam);
      let plan: TransactionPlan;

      beforeAll(async () => {
        plan = await import('./test-data/tx-plan.json').then(
          ({ default: json }: { default: unknown }) => TransactionPlan.fromJson(json as never),
        );
      });

      test('authorization success', async () => {
        const authData = await wallet.custody.authorize(passKey, walletId, plan);

        expect(new AuthorizationData(authData).toJson()).toMatchObject({
          effectHash: {
            inner:
              // effectHash is deterministic
              '893Otjfg4OeeAmkKfv4PCmajI58GTR2pE4/QGsgCRo9CRLYSPMPh2slkojPcyHujU8AhHUDjGlzyQB4j0+8MkQ==',
          },
          spendAuths: [
            {
              inner:
                // spendAuth is nondeterministic
                expect.stringMatching(/^[A-Za-z0-9+/]{86}==$/) as unknown,
            },
          ],
          // empty arrays will be missing from json
          // delegatorVoteAuths: [],
          // lqtVoteAuths: [],
        });
      });

      test('authorization with wrong wallet ID fails', async () => {
        const wrongWalletId = { inner: new Uint8Array() };

        await expect(wallet.custody.authorize(passKey, wrongWalletId, plan)).rejects.toThrow(
          'Wrong wallet',
        );
      });

      test('authorization with wrong pass key fails', async () => {
        const { key: wrongPassKey } = await Key.create('differentPassword');

        await expect(wallet.custody.authorize(wrongPassKey, walletId, plan)).rejects.toThrow();
      });
    });
  },
);
