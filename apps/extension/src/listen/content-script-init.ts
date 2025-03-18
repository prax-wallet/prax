import {
  isPraxConnectionMessage,
  PraxConnection,
} from '../content-scripts/message/prax-connection';
import { sendTab } from '../message/send/tab';
import { alreadyApprovedSender } from '../senders/approve';
import { assertValidSender } from '../senders/validate';

// listen for page init
export const contentScriptInitListener = (
  req: unknown,
  unvalidatedSender: chrome.runtime.MessageSender,
  // this handler will only ever send a null response
  respond: (r: null) => void,
): boolean => {
  if (!isPraxConnectionMessage(req) && req !== PraxConnection.Init) {
    return false;
  }

  const validSender = assertValidSender(unvalidatedSender);
  void alreadyApprovedSender(validSender).then(hasApproval => {
    if (hasApproval) {
      // init only the specific document
      void sendTab(validSender, PraxConnection.Init);
    }

    // handler is done
    respond(null);
  });

  // boolean return in handlers signals intent to respond
  return true;
};
