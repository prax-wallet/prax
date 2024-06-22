import { alreadyApprovedOrigin } from '../origins/approve-origin';
import { PraxConnection } from '../message/prax';
import { assertValidSender } from '../origins/valid-sender';

// trigger injected-connection-port when a known page inits.
chrome.runtime.onMessage.addListener(
  (req: unknown, sender, emptyResponse: (no?: never) => void) => {
    if (req !== PraxConnection.Init) return false;
    emptyResponse();

    void (async () => {
      const validSender = assertValidSender(sender);
      const alreadyApproved = await alreadyApprovedOrigin(validSender.origin);
      if (alreadyApproved)
        void chrome.tabs.sendMessage(validSender.tab.id, PraxConnection.Init, {
          documentId: validSender.documentId,
        });
    })();

    return true;
  },
);
