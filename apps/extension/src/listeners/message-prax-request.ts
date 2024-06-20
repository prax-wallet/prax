import { Code, ConnectError } from '@connectrpc/connect';
import { approveOrigin } from '../origins/approve-origin';
import { PraxConnection } from '../message/prax';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { PenumbraRequestFailure } from '@penumbra-zone/client';
import { assertValidSender } from '../origins/valid-sender';

// listen for page connection requests.
// this is the only message we handle from an unapproved content script.
chrome.runtime.onMessage.addListener(
  (req, sender, respond: (failure?: PenumbraRequestFailure) => void) => {
    if (req !== PraxConnection.Request) return false; // instruct chrome we will not respond

    void approveOrigin(sender).then(
      status => {
        const { documentId } = assertValidSender(sender);
        // user made a choice
        if (status === UserChoice.Approved) {
          respond();
          void chrome.runtime.sendMessage(PraxConnection.Init, { documentId });
        } else {
          respond(PenumbraRequestFailure.Denied);
        }
      },
      e => {
        if (globalThis.__DEV__) console.warn('Connection request listener failed:', e);

        if (e instanceof ConnectError && e.code === Code.Unauthenticated) {
          respond(PenumbraRequestFailure.NeedsLogin);
        } else {
          setTimeout(
            () => respond(PenumbraRequestFailure.Denied),
            // this was either an error or an automatic denial. apply a random
            // rejection delay between 2 and 12 seconds to obfuscate
            2000 + Math.random() * 10000,
          );
        }
      },
    );
    return true; // instruct chrome to wait for the response
  },
);
