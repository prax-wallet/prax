import {
  isPraxConnectionMessage,
  PraxConnection,
} from '../../content-scripts/message/prax-connection';
import { sendTab } from '../send/tab';
import { alreadyApprovedSender } from '../../senders/approve';
import { isValidExternalSender } from '../../senders/external';

// listen for page init
export const contentScriptInitListener = (
  req: unknown,
  sender: chrome.runtime.MessageSender,
  // this handler will only ever send a null response
  respond: (r: null) => void,
): boolean => {
  if (
    !isPraxConnectionMessage(req) ||
    req !== PraxConnection.Init ||
    !isValidExternalSender(sender)
  ) {
    return false;
  }

  void alreadyApprovedSender(sender).then(hasApproval => {
    if (hasApproval) {
      // init only the specific document
      void sendTab(sender, PraxConnection.Init);
    }

    // handler is done
    respond(null);
  });

  // boolean return in handlers signals intent to respond
  return true;
};
