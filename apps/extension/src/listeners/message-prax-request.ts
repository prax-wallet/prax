import { Code, ConnectError } from '@connectrpc/connect';
import { approveOrigin } from '../origins/approve-origin';
import { PraxConnection } from '../message/prax';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { PenumbraRequestFailure } from '@penumbra-zone/client';
import { assertValidSender } from '../origins/valid-sender';

// listen for page connection requests.
// this is the only message we handle from an unapproved content script.
chrome.runtime.onMessage.addListener(
  (req, unvalidatedSender, respond: (failure?: PenumbraRequestFailure) => void) => {
    if (req !== PraxConnection.Request) return false; // instruct chrome we will not respond

    const validSender = assertValidSender(unvalidatedSender);

    void approveOrigin(validSender).then(
      status => {
        // user interacted with the popup, resulting in a choice.
        if (status === UserChoice.Approved) {
          // the request was succesful
          respond();
          // init happens separately
          void chrome.tabs.sendMessage(validSender.tab.id, PraxConnection.Init, {
            documentId: validSender.documentId,
          });
        } else {
          respond(PenumbraRequestFailure.Denied);
        }
      },
      e => {
        // something is wrong. user may not have seen a popup.
        if (globalThis.__DEV__) console.warn('Connection request listener failed:', e);

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
    return true; // instruct chrome to wait for the response
  },
);
