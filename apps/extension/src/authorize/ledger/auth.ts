import {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { getFirstUsb, LedgerPenumbra } from './getLedgerUsb';

export const authorize = async (
  txPlan: TransactionPlan,
  signal: AbortSignal,
): Promise<AuthorizationData> => {
  const cancel = new Promise<never>((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason as Error));
  });

  const ledger = getFirstUsb().then(dev => LedgerPenumbra.claimUSB(dev));
  const auth = ledger.then(l => l.sign(txPlan));

  return await Promise.race([auth, cancel]).finally(() => void ledger.then(l => l.releaseUSB()));
};
