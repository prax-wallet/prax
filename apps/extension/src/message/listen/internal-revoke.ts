import { isInternalSender } from '../../senders/internal';
import { revokeOrigin } from '../../senders/revoke';
import { isControlRequest } from '../control';

export const internalRevokeListener = (
  req: unknown,
  sender: chrome.runtime.MessageSender,
  respond: (n: null) => void,
): boolean => {
  if (!isInternalSender(sender) || !isControlRequest('Revoke', req)) {
    return false;
  }
  revokeOrigin(req.Revoke);
  respond(null);
  return true;
};
