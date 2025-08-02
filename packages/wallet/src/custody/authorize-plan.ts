import { SpendKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import type {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { authorizePlan } from '@penumbra-zone/wasm/build';
import { generateSpendKey } from '@penumbra-zone/wasm/keys';
import { LedgerPenumbra } from '../webusb/ledger-penumbra';
import type { CustodyTypeName } from './types';
import type { Wallet } from '../wallet';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';

type AuthorizePlanFn<T extends CustodyTypeName> = (
  this: ThisType<Wallet<T>>,
  unsealed: string,
  plan: TransactionPlan,
) => Promise<AuthorizationData>;

console.debug('authorize-plan imported');

export default {
  async encryptedSeedPhrase(
    this: ThisType<Wallet<'encryptedSeedPhrase'>>,
    seedPhraseString: string,
    plan: TransactionPlan,
  ) {
    return Promise.resolve(authorizePlan(generateSpendKey(seedPhraseString), plan));
  },

  async encryptedSpendKey(
    this: ThisType<Wallet<'encryptedSpendKey'>>,
    spendKeyString: string,
    plan: TransactionPlan,
  ) {
    return Promise.resolve(authorizePlan(SpendKey.fromJsonString(spendKeyString), plan));
  },

  async ledgerUsb(
    this: ThisType<Wallet<'ledgerUsb'>>,
    usbRequestString: string,
    plan: TransactionPlan,
  ) {
    const usbRequest = JSON.parse(usbRequestString) as USBDeviceRequestOptions;
    const usbDevice = await navigator.usb.requestDevice(usbRequest);
    const transport = await TransportWebUSB.open(usbDevice);
    const ledgerApp = new LedgerPenumbra(transport);
    return ledgerApp.sign(plan);
  },
} satisfies {
  [T in CustodyTypeName]: AuthorizePlanFn<T>;
};
