import { toPlainMessage } from '@bufbuild/protobuf';
import { ledgerUSBVendorId } from '@ledgerhq/devices/lib-es/index';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { SpendKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { TransactionPlan } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { generateSpendKey, getFullViewingKey, getWalletId } from '@penumbra-zone/wasm/keys';
import { Box, BoxJson } from '@repo/encryption/box';
import { Key } from '@repo/encryption/key';
import Zemu, { DEFAULT_START_OPTIONS } from '@zondax/zemu';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { CustodyTypeName } from './custody/types';
import { Wallet, WalletJson } from './wallet';

const seedPhrase =
  'benefit cherry cannon tooth exhibit law avocado spare tooth that amount pumpkin scene foil tape mobile shine apology add crouch situate sun business explain';

const defaultOptions = {
  ...DEFAULT_START_OPTIONS,
  disablePool: true,
  logging: true,
  custom: `-s "${seedPhrase}"`,
  X11: false,
};

const spendKey = generateSpendKey(seedPhrase);
const fvk = getFullViewingKey(spendKey);
const walletId = getWalletId(fvk);
const label = 'Test Wallet';
const { key: passKey } = await Key.create('s0meUs3rP@ssword');

const custodyBoxes = {
  encryptedSeedPhrase: await passKey.seal(seedPhrase),
  encryptedSpendKey: await passKey.seal(new SpendKey(spendKey).toJsonString()),
  ledgerUsb: await passKey.seal(
    JSON.stringify({
      filters: [{ vendorId: ledgerUSBVendorId }],
    } satisfies USBDeviceRequestOptions),
  ),
} as const satisfies Record<CustodyTypeName, Box>;

describe.each(Object.keys(custodyBoxes) as (keyof typeof custodyBoxes)[])(
  'Wallet with %s custody',
  custodyType => {
    const custodyBox = custodyBoxes[custodyType];

    const custodyData = { [custodyType]: custodyBox } as Record<typeof custodyType, Box>;

    describe('Wallet constructor', () => {
      test('constructed with valid custody data', () => {
        const wallet = new Wallet(label, walletId, fvk, custodyData);

        expect(wallet.custodyType).toBe(custodyType);
      });

      test('constructed with undefined label', () => {
        expect(() => {
          new Wallet(undefined as never, walletId, fvk, custodyData);
        }).toThrow('label is not valid');
      });

      test('constructed with undefined wallet ID', () => {
        expect(() => {
          new Wallet(label, undefined as never, fvk, custodyData);
        }).toThrow('id is not valid');
      });

      test('constructed with undefined full viewing key', () => {
        expect(() => {
          new Wallet(label, walletId, undefined as never, custodyData);
        }).toThrow('full viewing key is not valid');
      });

      test('constructed with undefined custody type name', () => {
        expect(() => {
          new Wallet(label, walletId, fvk, {} as never);
        }).toThrow('Custody type name unknown: undefined');
      });

      test('constructed with undefined custody box', () => {
        expect(() => {
          new Wallet(label, walletId, fvk, { [custodyType]: undefined } as never);
        }).toThrow('custody box is not valid');
      });
    });

    describe('serialization', () => {
      const custodyJson = { [custodyType]: custodyBoxes[custodyType].toJson() } as Record<
        typeof custodyType,
        BoxJson
      >;

      const walletJson: WalletJson = {
        id: walletId.toJsonString(),
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

      test.each(['id', 'label', 'fullViewingKey', 'custody'] as const)(
        `throws if %s is missing`,
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

    describe('authorization', { timeout: 80_000 }, () => {
      let interact: () => Promise<void>;
      let sim: Promise<InstanceType<typeof Zemu>> | undefined;

      const MOCK_USB_DEVICE = '__MOCK_USB_DEVICE__';

      beforeEach(async ctx => {
        if (custodyType === 'ledgerUsb') {
          vi.stubGlobal('navigator', {
            get usb() {
              console.count('mock navigator.usb');
              return {
                requestDevice: (...args: unknown[]) => {
                  console.count('mock navigator.usb.requestDevice');
                  console.debug(args);
                  return Promise.resolve(MOCK_USB_DEVICE);
                },
                getDevices: () => Promise.resolve([MOCK_USB_DEVICE]),
              };
            },
          });

          sim = Promise.resolve(new Zemu(__LEDGER_APP__!)).then(async emulator => {
            console.count('zemu start');
            await emulator.start({ ...defaultOptions, model: __LEDGER_MODEL__! as never });
            return emulator;
          });

          await sim;

          vi.spyOn(TransportWebUSB, 'open').mockImplementation(async (...args) => {
            console.debug('mock call TransportWebUSB open', args);
            expect(args).toStrictEqual([MOCK_USB_DEVICE]);
            expect(sim).toBeDefined();
            return sim!.then(emulator => emulator.getTransport()) as never;
          });

          interact = async () => {
            expect(sim).toBeDefined();
            await sim!.then(async emulator => {
              await emulator.waitUntilScreenIsNot(emulator.getMainMenuSnapshot());
              await emulator.waitForText('Review');
              await emulator.compareSnapshotsAndApprove(
                '.',
                `${ctx.task.name}-${custodyType}`.replace(' ', '-'),
              );
            });
          };
        } else {
          sim = undefined;
          interact = async () => expect(sim).toBeUndefined();
          vi.stubGlobal('navigator', {
            get usb() {
              return null;
            },
          });
        }
      }, defaultOptions.startTimeout);

      afterEach(async () => {
        if (custodyType === 'ledgerUsb') {
          expect(sim).toBeDefined();
          await sim!.then(emulator => emulator.close());
          sim = undefined;
        } else {
          expect(sim).toBeUndefined();
        }
      });

      const wallet = new Wallet(label, walletId, fvk, custodyData);
      let plan: TransactionPlan;

      beforeAll(async () => {
        plan = await import('./test-data/tx-plan.json').then(
          ({ default: json }: { default: unknown }) => TransactionPlan.fromJson(json as never),
        );
      });

      test('authorization success', async () => {
        const custody = await wallet.custody(passKey);

        const authRequest = custody.authorizePlan(plan);

        await interact();

        const authData = await authRequest;

        expect(authData.toJson()).toMatchObject({
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

      test('authorization with wrong pass key fails', async () => {
        const { key: wrongPassKey } = await Key.create('differentPassword');

        await expect(wallet.custody(wrongPassKey)).rejects.toThrow(
          `Wrong key for "${label}" custody box`,
        );
      });
    });
  },
);
