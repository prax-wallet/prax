import { ResponseSign } from '@zondax/ledger-penumbra';
import { ResponseError } from '@zondax/ledger-js';
import { Buffer } from 'buffer';
import { DEFAULT_PATH as PENUMBRA_PATH } from '@zondax/ledger-penumbra';
import {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { getLedgerPenumbraApp } from './getLedgerUsb';

export const authorize = async (
  txPlan: TransactionPlan,
  signal: AbortSignal,
): Promise<AuthorizationData> => {
  const cancel = new Promise<never>((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason as Error));
  });

  const app = await getLedgerPenumbraApp();
  const txBuffer = Buffer.from(txPlan.toBinary());

  let ledgerAuth: ResponseSign;
  try {
    ledgerAuth = await Promise.race([app.sign(PENUMBRA_PATH, txBuffer, []), cancel]);
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
