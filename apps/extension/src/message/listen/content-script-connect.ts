import { Code, ConnectError } from '@connectrpc/connect';
import { PenumbraRequestFailure } from '@penumbra-zone/client';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { PraxConnection } from '../../content-scripts/message/prax-connection';
import { approveSender } from '../../senders/approve';
import { isValidExternalSender, ValidExternalSender } from '../../senders/external';
import { sendTab } from '../send/tab';

// listen for page requests for approval
export const contentScriptConnectListener = (
  req: unknown,
  sender: chrome.runtime.MessageSender,
  // responds with null or an enumerated failure
  respond: (r: null | PenumbraRequestFailure) => void,
): boolean => {
  if (!isValidExternalSender(sender)) {
    return false;
  }

  if (req !== PraxConnection.Connect) {
    return false;
  }

  void handle(sender).then(respond);
  return true;
};

const handle = (sender: ValidExternalSender) =>
  approveSender(sender).then(
    status => {
      // origin is already known, or popup choice was made
      if (status === UserChoice.Approved) {
        // init only the specific document
        void sendTab(sender, PraxConnection.Init);
        return null; // no failure
      } else {
        // any other choice is a denial
        return PenumbraRequestFailure.Denied;
      }
    },
    async e => {
      if (e instanceof ConnectError && e.code === Code.Unauthenticated) {
        // user did not see a popup.
        // the website should instruct the user to log in
        return PenumbraRequestFailure.NeedsLogin;
      } else {
        console.warn('Connection request listener failed', e);
        // user may not have seen a popup, and something strange is happening.
        // obfuscate this rejection with a random delay 2-12 secs
        const DELAY = 2_000 + Math.random() * 10_000;
        await new Promise<void>(resolve => setTimeout(() => resolve(), DELAY));
        return PenumbraRequestFailure.Denied;
      }
    },
  );
