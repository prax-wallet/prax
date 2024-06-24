import { PraxConnection } from '../message/prax';
import { alreadyApprovedOrigin } from '../origins/approve-origin';
import { assertValidSender } from '../origins/valid-sender';

// listen for page init
chrome.runtime.onMessage.addListener(
  (
    req,
    unvalidatedSender,
    // this handler will only ever send an empty response
    emptyResponse: (no?: never) => void,
  ) => {
    if (req !== PraxConnection.Init) {
      // boolean return in handlers signals intent to respond
      return false;
    }

    const validSender = assertValidSender(unvalidatedSender);

    void (async () => {
      const alreadyApproved = await alreadyApprovedOrigin(validSender.origin);
      if (alreadyApproved) {
        void chrome.tabs.sendMessage(validSender.tab.id, PraxConnection.Init, {
          // init only the specific document
          frameId: validSender.frameId,
          documentId: validSender.documentId,
        });
      }
    })();

    // handler is done
    emptyResponse();

    // boolean return in handlers signals intent to respond
    return true;
  },
);
