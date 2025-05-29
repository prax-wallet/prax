import { PraxConnection } from '../../content-scripts/message/prax-connection';
import { alreadyApprovedSender } from '../../senders/approve';
import { isValidExternalSender, ValidExternalSender } from '../../senders/external';
import { sendTab } from '../send/tab';

// listen for page init
export const contentScriptInitListener = (
  req: unknown,
  sender: chrome.runtime.MessageSender,
  // responds with null
  respond: (r: null) => void,
): boolean => {
  if (req !== PraxConnection.Init) {
    return false;
  }

  if (!isValidExternalSender(sender)) {
    return false;
  }

  void handle(sender).then(respond);
  return true;
};

const handle = (sender: ValidExternalSender) =>
  alreadyApprovedSender(sender).then(hasApproval => {
    if (hasApproval) {
      // init only the specific document
      void sendTab(sender, PraxConnection.Init);
    }

    // handler is done
    return null;
  });
