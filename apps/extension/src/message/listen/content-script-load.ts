import { PraxConnection } from '../../content-scripts/message/prax-connection';
import { alreadyApprovedSender } from '../../senders/approve';
import { isValidExternalSender, ValidExternalSender } from '../../senders/external';
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

  if (!isValidExternalSender(sender)) {
    return false;
  }

  void handle(sender).then(res => {
    if (globalThis.__DEV__) {
      console.debug('contentScriptLoadListener responding', { req, res });
    }
    respond(res);
  });
  return true;
};

const handle = (sender: ValidExternalSender) =>
  alreadyApprovedSender(sender).then(hasApproval => {
    if (hasApproval) {
      // preconnect only the specific document
      void sendTab(sender, PraxConnection.Preconnect);
    }

    // handler is done
    return null;
  });
