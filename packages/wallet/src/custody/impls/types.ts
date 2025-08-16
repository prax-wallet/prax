import type { Wallet } from '../../wallet';
import type { CustodyTypeName } from '../util';

/** A `WalletCustody` utility that is yet to be bound to a `Wallet`. */
export interface BindToWalletUnsealed<
  T extends CustodyTypeName,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- unknown function type
  F extends (...p: any[]) => any,
> extends ThisType<Wallet<T>> {
  (
    this: Wallet<T>,
    unsealed: Awaited<ReturnType<Wallet<T>['unseal']>>,
    ...fp: Parameters<F>
  ): ReturnType<F>;
}
