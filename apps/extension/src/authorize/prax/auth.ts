import { ConnectError, Code } from '@connectrpc/connect';
import {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { authorizePlan } from '@penumbra-zone/wasm/build';
import { getSpendKey } from './spend-key';
import { popup } from '../../popup';
import { PopupType } from '../../message/popup';
import { Jsonified } from '@penumbra-zone/types/jsonified';
import { UserChoice } from '@penumbra-zone/types/user-choice';

export const authorize = async (
  txPlan: TransactionPlan,
  signal: AbortSignal,
): Promise<AuthorizationData> => {
  const authData = authorizePlan(await getSpendKey(), txPlan);

  const popupResponse = await popup(
    PopupType.TxApproval,
    { txPlan: txPlan.toJson() as Jsonified<TransactionPlan> },
    signal,
  );

  const planned = popupResponse?.txPlan && TransactionPlan.fromJson(popupResponse.txPlan);
  if (!txPlan.equals(planned)) {
    throw new Error('Mismatched response from popup');
  }

  const choice = popupResponse?.choice;
  if (choice !== UserChoice.Approved) {
    throw new ConnectError('Transaction was not approved', Code.PermissionDenied);
  }

  return authData;
};
