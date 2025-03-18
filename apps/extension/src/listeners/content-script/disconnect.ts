import { PraxConnection } from '../../content-scripts/message/prax-connection';
import { alreadyApprovedSender } from '../../senders/approve';
import { revokeOrigin } from '../../senders/revoke';
import { assertValidSender } from '../../senders/validate';

// listen for page requests for disconnect
export const praxDisconnectListener: ChromeExtensionMessageEventListener = (
  req,
  unvalidatedSender,
  // this handler will only ever send an empty response
  respond: (no?: never) => void,
) => {
  if (req !== PraxConnection.Disconnect) {
    // boolean return in handlers signals intent to respond
    return false;
  }

  const validSender = assertValidSender(unvalidatedSender);
  void alreadyApprovedSender(validSender).then(hasApproval => {
    if (!hasApproval) {
      throw new Error('Sender does not possess approval');
    }
    revokeOrigin(validSender.origin);
    void chrome.tabs.sendMessage(validSender.tab.id, PraxConnection.End, {
      // end only the specific document
      frameId: validSender.frameId,
      documentId: validSender.documentId,
    });
  });
  respond();

  // boolean return in handlers signals intent to respond
  return true;
};
