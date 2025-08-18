import { DEFAULT_PATH as PENUMBRA_PATH } from '@zondax/ledger-penumbra';
import type { CustodyTypeName } from '../util';
import type { WalletCustody } from '../wallet-custody';
import { assertLedgerPenumbraFvk, getSpecificLedgerApp } from './util/ledger-util';
import type { BindToWalletUnsealed } from './types';

export const readyImpls: {
  [T in CustodyTypeName]: BindToWalletUnsealed<T, WalletCustody['ready']>;
} = {
  async encryptedSeedPhrase(seedPhrase: string) {
    if (!seedPhrase) {
      throw ReferenceError('No seed phrase unsealed');
    }
    return Promise.resolve();
  },

  async encryptedSpendKey(spendKeyJsonString: string) {
    if (!spendKeyJsonString) {
      throw ReferenceError('No spend key unsealed');
    }
    return Promise.resolve();
  },

  async ledgerUsb(deviceFilterJson: string) {
    const ac = new AbortController();
    try {
      const deviceFilter = JSON.parse(deviceFilterJson) as USBDeviceFilter;
      const ledgerApp = await getSpecificLedgerApp(deviceFilter, ac.signal);

      // check the device info
      // const deviceInfo = await ledgerApp.deviceInfo();
      // console.debug('deviceInfo', deviceInfo);

      // check the app info
      // const appInfo = await ledgerApp.appInfo();
      // console.debug('appInfo', appInfo);

      // check the fvk
      assertLedgerPenumbraFvk(
        await ledgerApp.getFVK(PENUMBRA_PATH, { account: 0 }),
        this.fullViewingKey,
      );
    } catch (cause) {
      ac.abort(cause);
      throw cause;
    }
  },
};
