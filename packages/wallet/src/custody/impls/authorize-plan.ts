import { SpendKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { authorizePlan } from '@penumbra-zone/wasm/build';
import { generateSpendKey } from '@penumbra-zone/wasm/keys';
import { DEFAULT_PATH as PENUMBRA_PATH } from '@zondax/ledger-penumbra';
import type { CustodyTypeName } from '../util';
import type { WalletCustody } from '../wallet-custody';
import {
  assertLedgerPenumbraFvk,
  convertLedgerAuthorizationData,
  getLedgerPenumbraBySerial,
} from './ledger-util';
import type { BindToWalletUnsealed } from './types';

export const authorizePlanImpls: {
  [T in CustodyTypeName]: BindToWalletUnsealed<T, WalletCustody['authorizePlan']>;
} = {
  async encryptedSeedPhrase(seedPhrase, plan) {
    const spendKey = generateSpendKey(seedPhrase);
    return Promise.resolve(authorizePlan(spendKey, plan));
  },

  async encryptedSpendKey(spendKeyString, plan) {
    const spendKey = SpendKey.fromJsonString(spendKeyString);
    return Promise.resolve(authorizePlan(spendKey, plan));
  },

  async ledgerUsb(ledgerSerial, plan) {
    const ledgerApp = await getLedgerPenumbraBySerial(ledgerSerial);
    assertLedgerPenumbraFvk(
      await ledgerApp.getFVK(PENUMBRA_PATH, { account: 0 }),
      this.fullViewingKey,
    );
    return convertLedgerAuthorizationData(
      await ledgerApp.sign(PENUMBRA_PATH, Buffer.from(plan.toBinary())).catch((cause: unknown) => {
        throw new Error(
          `Ledger failed to sign ${plan.actions.map(a => a.action.case).join()} with: ${String(cause)}`,
          { cause },
        );
      }),
    );
  },
};
