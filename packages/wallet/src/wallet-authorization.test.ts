/* eslint-disable no-nested-ternary */
import { JsonObject } from '@bufbuild/protobuf';
import { ledgerUSBVendorId } from '@ledgerhq/devices';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { SpendKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import {
  Action,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { authorizePlan } from '@penumbra-zone/wasm/build';
import { generateSpendKey, getFullViewingKey } from '@penumbra-zone/wasm/keys';
import { Box } from '@repo/encryption/box';
import { Key } from '@repo/encryption/key';
import Zemu, { DEFAULT_START_OPTIONS, type IStartOptions } from '@zondax/zemu';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  onTestFinished,
  test,
  vi,
} from 'vitest';
import type { CustodyTypeName } from './custody/util';
import { replaceUncaughtExceptionListener } from './test-data/util';
import { Wallet } from './wallet';

const MOCK_USB_DEVICE = {
  vendorId: ledgerUSBVendorId,
  serialNumber: crypto.randomUUID(),
};

const timeout = Number(import.meta.env.LEDGER_TIMEOUT);

const seedPhrase =
  'benefit cherry cannon tooth exhibit law avocado spare tooth that amount pumpkin scene foil tape mobile shine apology add crouch situate sun business explain';

const zemuOptions: IStartOptions = {
  ...DEFAULT_START_OPTIONS,
  startTimeout: timeout / 6,
  model: import.meta.env.LEDGER_MODEL as never,
  disablePool: true,
  logging: false,
  custom: `-s "${seedPhrase}" --log-level werkzeug:ERROR`,
  X11: false,
};

const spendKey = generateSpendKey(seedPhrase);
const fvk = getFullViewingKey(spendKey);
const label = 'Test Wallet';
const { key: passKey } = await Key.create('s0meUs3rP@ssword');

const custodyBoxes: Record<CustodyTypeName, Box> = {
  encryptedSeedPhrase: await passKey.seal(seedPhrase),
  encryptedSpendKey: await passKey.seal(new SpendKey(spendKey).toJsonString()),
  ledgerUsb: await passKey.seal(JSON.stringify(MOCK_USB_DEVICE)),
};

type ActionTypeName = NonNullable<Action['action']['case']>;

const unsupportedActions: Record<CustodyTypeName, Set<ActionTypeName>> = {
  encryptedSeedPhrase: new Set(),
  encryptedSpendKey: new Set(),
  ledgerUsb: new Set([
    'actionLiquidityTournamentVote',
    'communityPoolDeposit',
    'communityPoolOutput',
    'communityPoolSpend',
    'ibcRelayAction',
    'proposalDepositClaim',
    'proposalSubmit',
    'proposalWithdraw',
    'swap',
    'swapClaim',
    'validatorDefinition',
    'validatorVote',

    // deprecated action name?
    'positionOpen',
  ]),
};

const ignoredActions: Record<CustodyTypeName, Set<ActionTypeName>> = {
  encryptedSeedPhrase: new Set(),
  encryptedSpendKey: new Set(),
  ledgerUsb: new Set(['delegatorVote']),
};

const createTestData = (plans: JsonObject[]) =>
  plans.map(planJson => {
    const plan = TransactionPlan.fromJson(planJson);
    return {
      plan,
      expectData: authorizePlan(spendKey, plan),
      actions: plan.actions.map(({ action }) => action.case!),
    };
  });

const testData = [
  {
    dataSet: 'txPlan',
    data: await import('./test-data/tx-plan.json').then(({ default: plans }) =>
      createTestData(plans as never),
    ),
  },
  {
    dataSet: 'zondaxLedger',
    data: await import('./test-data/zondax_ledger_penumbra_testcases.json').then(
      ({ default: plans }) => createTestData(plans as never),
    ),
  },
  {
    dataSet: 'penumbraPr4948',
    data: await import('./test-data/penumbra_pr4948_transaction_plans.json').then(
      ({ default: plans }) => createTestData(plans as never),
    ),
  },
].flatMap(({ dataSet, data }) => data.map(d => ({ dataSet, ...d })));

describe.each(Object.keys(custodyBoxes) as CustodyTypeName[])(
  'custody %s plan authorization',
  custodyType => {
    const custodyBox = custodyBoxes[custodyType];
    const custodyData = { [custodyType]: custodyBox } as Record<typeof custodyType, Box>;

    const interact = vi.fn<[timeout: number], void | Promise<void>>();
    let sim: Promise<InstanceType<typeof Zemu>> | undefined;

    const { uncaughtExceptionListener, restoreUncaughtExceptionListener } =
      replaceUncaughtExceptionListener();

    beforeEach(async ctx => {
      expect(uncaughtExceptionListener).not.toHaveBeenCalled();
      uncaughtExceptionListener.mockClear();

      if (custodyType === 'ledgerUsb') {
        vi.stubGlobal('navigator', {
          get usb() {
            return {
              requestDevice: () => Promise.resolve(MOCK_USB_DEVICE),
              getDevices: () => Promise.resolve([MOCK_USB_DEVICE]),
            };
          },
        });

        sim = Promise.resolve(new Zemu(import.meta.env.LEDGER_APP)).then(async emulator => {
          await emulator.start(zemuOptions);
          return emulator;
        });

        await sim;

        vi.spyOn(TransportWebUSB, 'open').mockImplementation(async (...args) => {
          expect(args).toStrictEqual([MOCK_USB_DEVICE]);

          const transport = (await sim!.then(emulator =>
            emulator.getTransport(),
          )) as TransportWebUSB;

          return transport;
        });
      } else {
        sim = undefined;
        vi.stubGlobal('navigator', {
          get usb() {
            return null;
          },
        });
      }

      interact.mockImplementationOnce((actionTimeout: number) =>
        sim?.then(async emulator => {
          await emulator.waitUntilScreenIsNot(emulator.getMainMenuSnapshot());
          await emulator.waitForText('Review', actionTimeout);
          const snapshotName = `${ctx.task.suite.name}_${ctx.task.name}`
            .trim()
            .replaceAll(/[\s,]/g, '-')
            .replaceAll(/[^\w\d-_]/g, '');
          await emulator.compareSnapshotsAndApprove(
            '.',
            snapshotName,
            undefined,
            undefined,
            actionTimeout,
          );
        }),
      );
    }, zemuOptions.startTimeout);

    afterEach(async () => {
      if (custodyType === 'ledgerUsb') {
        expect(sim).toBeDefined();
        await sim!.then(emulator => emulator.close());
        sim = undefined;
      } else {
        expect(sim).toBeUndefined();
      }
      expect(uncaughtExceptionListener).not.toHaveBeenCalled();
      uncaughtExceptionListener.mockClear();
    });

    afterAll(() => {
      expect(uncaughtExceptionListener).not.toHaveBeenCalled();
      restoreUncaughtExceptionListener();
    });

    const wallet = new Wallet(label, fvk, custodyData);

    describe.each(testData)('$dataSet %#', ({ plan, expectData, actions }) => {
      const rejectActions = new Set(actions).intersection(unsupportedActions[custodyType]);
      const missingAuths = new Set(actions).intersection(ignoredActions[custodyType]);

      const outcome = rejectActions.size
        ? `fail ${Array.from(rejectActions).join()}`
        : missingAuths.size
          ? `miss ${Array.from(missingAuths).join()}`
          : 'pass';

      test.skip(`${custodyType} ${actions.join()} should ${outcome}`, { timeout }, async () => {
        onTestFinished(() => {
          expect(uncaughtExceptionListener).not.toHaveBeenCalled();
          uncaughtExceptionListener.mockClear();
        });

        const custody = await wallet.custody(passKey);

        const authRequest = custody.authorizePlan(plan);
        const interaction = interact(
          // swaps are large and need extra time
          rejectActions.has('swap')
            ? timeout / 3
            : // other rejected actions should fail pretty quick
              rejectActions.size
              ? timeout / 6
              : // normal tests need a bit of time
                timeout / 4,
        );

        if (rejectActions.size) {
          await Promise.allSettled([authRequest, interaction]);
          await expect(authRequest).rejects.toThrow('Data is invalid : Invalid action type');
          await expect(interaction).rejects.toThrow('waiting for text (Review)');
        } else {
          const authData = await authRequest;
          await interaction;

          // Effect hash is deterministic and should match
          expect(authData.effectHash?.equals(expectData.effectHash)).toBeTruthy();

          // Action auths are non-deterministic, but should match length
          expect(authData.spendAuths.length).toBe(expectData.spendAuths.length);
          expect(authData.lqtVoteAuths.length).toBe(expectData.lqtVoteAuths.length);

          expect(authData.delegatorVoteAuths.length).toBe(
            !missingAuths.has('delegatorVote') ? expectData.delegatorVoteAuths.length : 0,
          );
        }
      });
    });
  },
);
