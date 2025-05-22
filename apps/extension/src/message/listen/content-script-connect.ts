import { Code, ConnectError } from '@connectrpc/connect';
import { PenumbraRequestFailure } from '@penumbra-zone/client';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import {
  isPraxConnectionMessage,
  PraxConnection,
} from '../../content-scripts/message/prax-connection';
import { sendTab } from '../send/tab';
import { approveSender } from '../../senders/approve';
import { isValidExternalSender } from '../../senders/external';

// listen for page requests for approval
export const contentScriptConnectListener = (
  req: unknown,
  sender: chrome.runtime.MessageSender,
  // this handler responds with nothing, or an enumerated failure reason
  respond: (r: null | PenumbraRequestFailure) => void,
): boolean => {
  if (
    !isPraxConnectionMessage(req) ||
    req !== PraxConnection.Connect ||
    !isValidExternalSender(sender)
  ) {
    // boolean return in handlers signals intent to respond
    return false;
  }

  void approveSender(sender).then(
    status => {
      // origin is already known, or popup choice was made
      if (status === UserChoice.Approved) {
        // init only the specific document
        void sendTab(sender, PraxConnection.Init);
        // handler is done
        respond(null); // no failure
      } else {
        // any other choice is a denial
        respond(PenumbraRequestFailure.Denied);
      }
    },
    e => {
      // something is wrong. user may not have seen a popup
      if (globalThis.__DEV__) {
        console.warn('Connection request listener failed:', e);
      }

      if (e instanceof ConnectError && e.code === Code.Unauthenticated) {
        // user did not see a popup.
        // the website should instruct the user to log in
        respond(PenumbraRequestFailure.NeedsLogin);
      } else {
        // user may not have seen a popup.
        // something strange is happening. either storage is broken, the popup
        // returned an error, the sender is invalid, or someone's misbehaving.
        // obfuscate this rejection with a random delay 2-12 secs
        setTimeout(() => respond(PenumbraRequestFailure.Denied), 2000 + Math.random() * 10000);
      }
    },
  );

  // boolean return in handlers signals intent to respond
  return true;
};
