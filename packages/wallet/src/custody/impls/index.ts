import type { Wallet } from '../../wallet';
import type { CustodyTypeName } from '../util';
import type { WalletCustody } from '../wallet-custody';
import { authorizePlanImpls } from './authorize-plan';

/**
 * Bind the appropriate utility implementations to a given {@link Wallet}, and
 * return the bound utilities.
 *
 * @param to instance to which the implementations shall be bound
 * @param unsealed decrypted data from the wallet's custody box
 */
export function bindCustodyImpl<T extends CustodyTypeName>(
  to: Wallet<T>,
  unsealed: Awaited<ReturnType<Wallet<T>['unseal']>>,
): WalletCustody {
  return {
    authorizePlan: authorizePlanImpls[to.custodyType].bind(to, unsealed),
  };
}
