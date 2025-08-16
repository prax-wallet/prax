import { SpendKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { authorizePlan } from '@penumbra-zone/wasm/build';
import { generateSpendKey } from '@penumbra-zone/wasm/keys';
import { DEFAULT_PATH as PENUMBRA_PATH } from '@zondax/ledger-penumbra';
import type { CustodyTypeName } from '../util';
import type { WalletCustody } from '../wallet-custody';
import { convertLedgerAuthorizationData, getSpecificLedgerApp } from './util/ledger-util';
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

  async ledgerUsb(deviceFilterJson, plan) {
    const ac = new AbortController();
    try {
      const deviceFilter = JSON.parse(deviceFilterJson) as USBDeviceFilter;
      const ledgerApp = await getSpecificLedgerApp(deviceFilter, ac.signal);

      // check the device info
      // const deviceInfo = await ledgerApp.deviceInfo();
      // console.debug('deviceInfo', deviceInfo);

      const signed = await ledgerApp.sign(PENUMBRA_PATH, plan.toBinary() as Buffer);

      return convertLedgerAuthorizationData(signed);
    } catch (cause) {
      ac.abort(cause);
      throw cause;
    }
  },
};
