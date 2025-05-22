import { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import {
  isPraxConnectionMessage,
  PraxConnection,
} from '../../content-scripts/message/prax-connection';
import { alreadyApprovedSender } from '../../senders/approve';
import { isValidExternalSender } from '../../senders/external';
import { CRSessionManager } from '@penumbra-zone/transport-chrome/session-manager';
import { revokeOrigin } from '../../senders/revoke';

// listen for page requests for disconnect
export const contentScriptDisconnectListener = (
  req: unknown,
  sender: chrome.runtime.MessageSender,
  // this handler will only ever send a null response, or an enumerated failure reason
  respond: (r: null | PenumbraRequestFailure) => void,
): boolean => {
  if (
    !isPraxConnectionMessage(req) ||
    req !== PraxConnection.Disconnect ||
    !isValidExternalSender(sender)
  ) {
    // boolean return in handlers signals intent to respond
    return false;
  }

  void alreadyApprovedSender(sender).then(hasApproval => {
    const { origin: targetOrigin } = sender;

    if (!hasApproval) {
      if (globalThis.__DEV__) {
        console.warn('Sender requesting disconnect does not possess approval', sender);
      }
      // this is strange, but session termination still makes sense
      CRSessionManager.killOrigin(targetOrigin);
      respond(PenumbraRequestFailure.Denied);
    } else {
      revokeOrigin(targetOrigin);
      respond(null);
    }
  });

  // boolean return in handlers signals intent to respond
  return true;
};
