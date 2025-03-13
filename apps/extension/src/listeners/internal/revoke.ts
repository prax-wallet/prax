import { ConnectError } from '@connectrpc/connect';
import { errorToJson } from '@connectrpc/connect/protocol-connect';
import {
  InternalFailure,
  InternalRequestType,
  InternalResponse,
  isInternalRequest,
} from '../../message/internal';
import { isInternalSender } from '../../senders/internal';
import { revokeOrigin } from '../../senders/revoke';

// listen for internal revoke commands
export const praxRevokeListener: ChromeExtensionMessageEventListener = (
  req: unknown,
  sender: chrome.runtime.MessageSender,
  respond: (r: InternalResponse<InternalRequestType.Revoke> | InternalFailure) => void,
) => {
  if (isInternalSender(sender) && isInternalRequest(InternalRequestType.Revoke, req)) {
    void revokeOrigin(req.Revoke).then(
      () => respond({ Revoke: null }),
      e => respond({ error: errorToJson(ConnectError.from(e), undefined) }),
    );
    return true;
  }

  return false;
};
