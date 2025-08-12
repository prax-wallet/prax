import type { CustodyTypeName } from './custody/util';
import type { Wallet } from './wallet';

export function isWalletType<T extends CustodyTypeName>(
  custodyTypeName: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- may be any kind of wallet
  wallet?: Wallet<any>,
): wallet is Wallet<T> {
  return wallet?.custodyType === custodyTypeName;
}

export function assertWalletType<T extends CustodyTypeName>(
  custodyTypeName: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- may be any kind of wallet
  wallet?: Wallet<any>,
): asserts wallet is Wallet<T> {
  if (!isWalletType(custodyTypeName, wallet)) {
    throw new TypeError(
      `Wallet "${wallet?.label}" is type "${wallet?.custodyType}" and not "${custodyTypeName}"`,
    );
  }
}
