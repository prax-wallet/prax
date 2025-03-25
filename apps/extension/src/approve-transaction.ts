import { PartialMessage } from '@bufbuild/protobuf';
import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import type { Jsonified } from '@penumbra-zone/types/jsonified';
import { popup } from './popup';

export const approveTransaction = async (
  partialAuthorizeRequest: PartialMessage<AuthorizeRequest>,
) => {
  const authorizeRequest = new AuthorizeRequest(partialAuthorizeRequest);

  const popupResponse = await popup('TxApproval', {
    authorizeRequest: new AuthorizeRequest(
      authorizeRequest,
    ).toJson() as Jsonified<AuthorizeRequest>,
  });

  if (popupResponse) {
    const resAuthorizeRequest = AuthorizeRequest.fromJson(popupResponse.authorizeRequest);

    if (!authorizeRequest.equals(resAuthorizeRequest)) {
      throw new Error('Invalid response from popup');
    }
  }

  return popupResponse?.choice;
};
