import { Code, ConnectError } from '@connectrpc/connect';
import { PenumbraRequestFailure } from '@penumbra-zone/client';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { PraxConnection } from '../../message/prax';
import { approveSender } from '../../senders/approve';
import { assertValidSender } from '../../senders/validate';

// listen for page requests for approval
export const praxRequestListener: ChromeExtensionMessageEventListener = (
  req,
  unvalidatedSender,
  // this handler responds with nothing, or an enumerated failure reason
  respond: (failure?: PenumbraRequestFailure) => void,
) => {
  if (req !== PraxConnection.Request) {
    // boolean return in handlers signals intent to respond
    return false;
  }

  const validSender = assertValidSender(unvalidatedSender);

  void approveSender(validSender).then(
    status => {
      // origin is already known, or popup choice was made
      if (status === UserChoice.Approved) {
        void chrome.tabs.sendMessage(validSender.tab.id, PraxConnection.Init, {
          // init only the specific document
          frameId: validSender.frameId,
          documentId: validSender.documentId,
        });
        // handler is done
        respond();
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
        // the website should instruct the user to log in
        respond(PenumbraRequestFailure.NeedsLogin);
      } else {
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
