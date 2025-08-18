import {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import {
  AuthorizeRequest,
  AuthorizeResponse,
} from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import { Jsonified } from '@penumbra-zone/types/jsonified';
import { PopupType } from '../message/popup';
import { popup } from '../popup';

export const getAuthorization = async (plan: TransactionPlan): Promise<AuthorizationData> => {
  const authData = await popup(PopupType.TxApproval, {
    authorizeRequest: new AuthorizeRequest({ plan }).toJson() as Jsonified<AuthorizeRequest>,
  }).then(response => AuthorizeResponse.fromJson(response!.authorizeResponse).data!);
  return authData;
};
