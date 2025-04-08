import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { PenumbraApp, ResponseSign } from '@zondax/ledger-penumbra';
import { ResponseError } from '@zondax/ledger-js';
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

export const authorize = async (
  txPlan: TransactionPlan,
  signal: AbortSignal,
): Promise<AuthorizationData> => {
  const cancel = new Promise<never>((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason as Error));
  });

  const app = await connectLedger();
  const txBuffer = Buffer.from(txPlan.toBinary());

  let ledgerAuth: ResponseSign;
  try {
    // todo: address index in path?
    ledgerAuth = await Promise.race([app.sign(DEFAULT_PATH, txBuffer, []), cancel]);
  } catch (e) {
    if (e instanceof ResponseError) {
      switch (e.returnCode) {
        case 28161:
          throw new Error('You need to open the penumbra app on your ledger device');
        default:
          throw new Error(`Ledger error: ${e.returnCode} ${e.message}`, { cause: e });
      }
    } else {
      console.log('ledger failed', e, JSON.stringify(e));
    }
    throw e;
  }

  return new AuthorizationData({
    effectHash: { inner: new Uint8Array(ledgerAuth.effectHash) },
    spendAuths: ledgerAuth.spendAuthSignatures.map(b => ({ inner: new Uint8Array(b) })),
    delegatorVoteAuths: ledgerAuth.delegatorVoteSignatures.map(b => ({
      inner: new Uint8Array(b),
    })),
  });
};
