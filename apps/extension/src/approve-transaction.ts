import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import { PartialMessage } from '@bufbuild/protobuf';
import type { Jsonified } from '@penumbra-zone/types/jsonified';
import { popup } from './popup';

export const approveTransaction = async (
  partialAuthorizeRequest: PartialMessage<AuthorizeRequest>,
) => {
  const authorizeRequest = new AuthorizeRequest(partialAuthorizeRequest);

  const popupResponse = await popup<'AuthorizeTransaction'>({
    AuthorizeTransaction: authorizeRequest.toJson() as Jsonified<AuthorizeRequest>,
  });

  return popupResponse?.AuthorizeTransaction;
};
