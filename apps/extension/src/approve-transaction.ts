import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import type { Jsonified } from '@penumbra-zone/types/jsonified';
import { PopupType } from './message/popup';
import { popup } from './popup';
import { TransactionPlan } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';

export const approveTransaction = async (plan: TransactionPlan) => {
  const popupResponse = await popup(PopupType.TxApproval, {
    authorizeRequest: new AuthorizeRequest({ plan }).toJson() as Jsonified<AuthorizeRequest>,
  });

  if (popupResponse) {
    const resAuthorizeRequest = AuthorizeRequest.fromJson(popupResponse.authorizeRequest);

    if (!plan.equals(resAuthorizeRequest.plan)) {
      throw new Error('Invalid response from popup');
    }
  }

  return popupResponse?.choice;
};
