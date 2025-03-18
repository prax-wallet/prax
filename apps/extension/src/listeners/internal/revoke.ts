import { isPraxRevokeMessage } from '../../message/revoke';
import { isInternalSender } from '../../senders/internal';
import { revokeOrigin } from '../../senders/revoke';

// listen for internal revoke commands
export const internalRevokeListener = (
  req: unknown,
  sender: chrome.runtime.MessageSender,
  respond: (n: null) => void,
): boolean => {
  if (!isInternalSender(sender) || !isPraxRevokeMessage(req)) {
    return false;
  }
  revokeOrigin(req.revoke);
  respond(null);
  return true;
};
