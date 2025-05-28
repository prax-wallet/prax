import { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import { CRSessionManager } from '@penumbra-zone/transport-chrome/session-manager';
import { PraxConnection } from '../../content-scripts/message/prax-connection';
import { alreadyApprovedSender } from '../../senders/approve';
import { isValidExternalSender, ValidExternalSender } from '../../senders/external';
import { revokeOrigin } from '../../senders/revoke';

// listen for page requests for disconnect
export const contentScriptDisconnectListener = (
  req: unknown,
  sender: chrome.runtime.MessageSender,
  // responds with null or an enumerated failure
  respond: (r: null | PenumbraRequestFailure) => void,
): boolean => {
  if (req === PraxConnection.Disconnect && isValidExternalSender(sender)) {
    void handle(sender).then(respond);
    return true;
  }
  return false;
};

const handle = (sender: ValidExternalSender) =>
  alreadyApprovedSender(sender).then(hasApproval => {
    if (hasApproval) {
      revokeOrigin(sender.origin);
      return null;
    } else {
      console.warn('Sender requesting disconnect does not possess approval', sender);
      // this is strange, but session termination still makes sense
      CRSessionManager.killOrigin(sender.origin);
      return PenumbraRequestFailure.Denied;
    }
  });
