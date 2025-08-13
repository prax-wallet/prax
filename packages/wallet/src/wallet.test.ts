import { toPlainMessage } from '@bufbuild/protobuf';
import { SpendKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { generateSpendKey, getFullViewingKey, getWalletId } from '@penumbra-zone/wasm/keys';
import { Box, type BoxJson } from '@repo/encryption/box';
import { Key } from '@repo/encryption/key';
import { describe, expect, test } from 'vitest';
import type { CustodyTypeName } from './custody/util';
import { Wallet, type WalletJson } from './wallet';

const seedPhrase =
  'benefit cherry cannon tooth exhibit law avocado spare tooth that amount pumpkin scene foil tape mobile shine apology add crouch situate sun business explain';

const spendKey = generateSpendKey(seedPhrase);
const fvk = getFullViewingKey(spendKey);
const walletId = getWalletId(fvk);
const label = 'Test Wallet';
const { key: passKey } = await Key.create('s0meUs3rP@ssword');

const custodyBoxes = {
  encryptedSeedPhrase: await passKey.seal(seedPhrase),
  encryptedSpendKey: await passKey.seal(new SpendKey(spendKey).toJsonString()),
  ledgerUsb: await passKey.seal('not a real serial number'),
} as const satisfies Record<CustodyTypeName, Box>;

describe.each(Object.keys(custodyBoxes) as (keyof typeof custodyBoxes)[])(
  'Wallet with %s custody',
  custodyType => {
    const custodyBox = custodyBoxes[custodyType];

    const custodyData = { [custodyType]: custodyBox } as Record<typeof custodyType, Box>;

    describe('Wallet constructor', () => {
      test('constructed with valid custody data', () => {
        const wallet = new Wallet(label, fvk, custodyData);

        expect(wallet.custodyType).toBe(custodyType);
      });

      test('constructed with undefined label', () => {
        expect(() => {
          new Wallet(undefined as never, fvk, custodyData);
        }).toThrow('label is not valid');
      });

      test('constructed with undefined full viewing key', () => {
        expect(() => {
          new Wallet(label, undefined as never, custodyData);
        }).toThrow('full viewing key is not valid');
      });

      test('constructed with undefined custody type name', () => {
        expect(() => {
          new Wallet(label, fvk, {} as never);
        }).toThrow('Custody type name unknown: undefined');
      });

      test('constructed with undefined custody box', () => {
        expect(() => {
          new Wallet(label, fvk, { [custodyType]: undefined } as never);
        }).toThrow('custody box is not valid');
      });
    });

    describe('serialization', () => {
      const custodyJson = { [custodyType]: custodyBoxes[custodyType].toJson() } as Record<
        typeof custodyType,
        BoxJson
      >;

      const walletJson: WalletJson = {
        label: label,
        fullViewingKey: fvk.toJsonString(),
        custody: custodyJson,
      };

      test('round-trip', () => {
        const deserialized = Wallet.fromJson(walletJson);

        expect(deserialized.label).toBe(walletJson.label);
        expect(toPlainMessage(deserialized.id)).toStrictEqual(toPlainMessage(walletId));
        expect(toPlainMessage(deserialized.fullViewingKey)).toStrictEqual(toPlainMessage(fvk));

        expect(deserialized.custodyType).toBe(Object.keys(walletJson.custody)[0]);

        expect(deserialized.toJson()).toStrictEqual(walletJson);
      });

      test.each(['label', 'fullViewingKey', 'custody'] satisfies (keyof WalletJson)[])(
        `throws if %s is missing`,
        walletJsonField => {
          expect(() =>
            Wallet.fromJson({
              ...walletJson,
              [walletJsonField]: undefined as never,
            }),
          ).toThrow();
        },
      );
    });
  },
);
