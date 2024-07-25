import { isPraxRevoke } from '../../message/prax';
import { revokeOrigin } from '../../senders/revoke';
import { isInternalSender } from '../../senders/internal';

// listen for internal revoke commands
export const praxRevokeListener: ChromeExtensionMessageEventListener = (
  req,
  sender,
  respond: (no?: never) => void,
) => {
  if (!isInternalSender(sender) || !isPraxRevoke(req)) {
    return false;
  }
  revokeOrigin(req.revoke);
  respond();
  return true;
};
