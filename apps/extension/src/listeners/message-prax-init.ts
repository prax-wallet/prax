import { PraxConnection } from '../message/prax';
import { alreadyApprovedSender } from '../senders/approve';
import { assertValidSender } from '../senders/validate';

// listen for page init
chrome.runtime.onMessage.addListener(
  (
    req,
    unvalidatedSender,
    // this handler will only ever send an empty response
    resepond: (no?: never) => void,
  ) => {
    if (req !== PraxConnection.Init) {
      // boolean return in handlers signals intent to respond
      return false;
    }

    const validSender = assertValidSender(unvalidatedSender);

    void (async () => {
      const alreadyApproved = await alreadyApprovedSender(validSender);
      if (alreadyApproved)
        void chrome.tabs.sendMessage(validSender.tab.id, PraxConnection.Init, {
          // init only the specific document
          frameId: validSender.frameId,
          documentId: validSender.documentId,
        });
    })();

    // handler is done
    resepond();

    // boolean return in handlers signals intent to respond
    return true;
  },
);
