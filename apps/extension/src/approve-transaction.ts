import { PartialMessage } from '@bufbuild/protobuf';
import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import type { Jsonified } from '@penumbra-zone/types/jsonified';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { DialogRequestType } from './message/popup';
import { popup } from './popup';

export const approveTransaction = async (
  authorizeRequest: PartialMessage<AuthorizeRequest>,
): Promise<UserChoice> => {
  console.debug('approveTransaction', authorizeRequest);
  const result = await popup(
    await chrome.windows.getLastFocused(),
    DialogRequestType.AuthorizeTransaction,
    new AuthorizeRequest(authorizeRequest).toJson() as Jsonified<AuthorizeRequest>,
  );
  return result ?? UserChoice.Denied;
};
