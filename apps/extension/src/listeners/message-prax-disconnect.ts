import { PraxConnection } from '../message/prax';
import { disconnectSender } from '../senders/disconnect';
import { assertValidSender } from '../senders/validate';

// listen for page requests for disconnect
chrome.runtime.onMessage.addListener(
  (
    req,
    unvalidatedSender,
    // this handler will only ever send an empty response
    respond: (no?: never) => void,
  ) => {
    if (req !== PraxConnection.Disconnect) {
      // boolean return in handlers signals intent to respond
      return false;
    }

    const validSender = assertValidSender(unvalidatedSender);
    disconnectSender(validSender);
    respond();

    // boolean return in handlers signals intent to respond
    return true;
  },
);
