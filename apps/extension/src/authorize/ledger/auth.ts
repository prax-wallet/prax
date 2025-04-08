import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { PenumbraApp } from '@zondax/ledger-penumbra';
import { Buffer } from 'buffer';
import { DEFAULT_PATH } from './util';
import {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';

/*
import { convertBits, encodeBech32m } from './ledger-utils';
import { AddressIndex } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';

const getLedgerAddress = async (app: PenumbraApp, addressIndex: AddressIndex) => {
  const { address: ledgerAddress, ...response } = await app.getAddress(DEFAULT_PATH, {
    account: addressIndex.account,
    randomizer: Buffer.from(addressIndex.randomizer),
  });
  if (!ledgerAddress) {
    throw new ReferenceError('No ledger address', { cause: response });
  }

  return encodeBech32m('penumbra', convertBits(new Uint8Array(ledgerAddress), 8, 5, true));
};
*/

const connectLedger = async () => new PenumbraApp(await TransportWebUSB.create());

export default async (txPlan: TransactionPlan): Promise<AuthorizationData> => {
  const app = await connectLedger();

  const txBuffer = Buffer.from(txPlan.toBinary());

  // todo: address index in path?
  const ledgerAuth = await app.sign(DEFAULT_PATH, txBuffer, []);

  return new AuthorizationData({
    effectHash: { inner: new Uint8Array(ledgerAuth.effectHash) },
    spendAuths: ledgerAuth.spendAuthSignatures.map(b => ({ inner: new Uint8Array(b) })),
    delegatorVoteAuths: ledgerAuth.delegatorVoteSignatures.map(b => ({ inner: new Uint8Array(b) })),
  });
};
