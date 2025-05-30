import { PraxConnection } from '../../content-scripts/message/prax-connection';
import { PraxControl } from '../../content-scripts/message/prax-control';
import { alreadyApprovedSender } from '../../senders/approve';
import {
  isPrerenderingExternalSender,
  isValidExternalSender,
  PrerenderingExternalSender,
  ValidExternalSender,
} from '../../senders/external';
import { sendTab } from '../send/tab';

// listen for page init
export const contentScriptLoadListener = (
  req: unknown,
  sender: chrome.runtime.MessageSender,
  // responds with null
  respond: (r: null) => void,
): boolean => {
  if (req !== PraxConnection.Load) {
    return false;
  }

  if (!isValidExternalSender(sender) && !isPrerenderingExternalSender(sender)) {
    return false;
  }

  void handle(sender).then(respond);
  return true;
};

const handle = (sender: ValidExternalSender | PrerenderingExternalSender) =>
  alreadyApprovedSender(sender).then(hasApproval => {
    if (hasApproval) {
      // preconnect only the specific document
      void sendTab(sender, PraxControl.Preconnect);
    }

    // handler is done
    return null;
  });
