import {
  PraxMessage,
  isPraxConnectMessageEvent,
  isPraxDisconnectMessageEvent,
} from './message-event';
import { PraxConnection } from '../message/prax';
import { PenumbraRequestFailure } from '@penumbra-zone/client/error';

const failureMessage = (failure?: unknown): PraxMessage<PenumbraRequestFailure> => {
  if (typeof failure === 'string' && failure in PenumbraRequestFailure) {
    return { [PRAX]: failure };
  } else {
    console.error('Bad response', failure);
    return { [PRAX]: PenumbraRequestFailure.BadResponse };
  }
};

window.addEventListener('message', (ev: MessageEvent<unknown>) => {
  if (ev.origin === window.origin) {
    void (async () => {
      // any response to these messages only indicates failure.
      let failure: PenumbraRequestFailure | undefined;

      if (isPraxConnectMessageEvent(ev)) {
        try {
          failure = await chrome.runtime.sendMessage(PraxConnection.Connect);
        } catch (e) {
          console.error(e);
          failure = PenumbraRequestFailure.NotHandled;
        }
      } else if (isPraxDisconnectMessageEvent(ev)) {
        try {
          failure = await chrome.runtime.sendMessage(PraxConnection.Disconnect);
        } catch (e) {
          console.error(e);
          failure = PenumbraRequestFailure.NotHandled;
        }
      }

      if (failure != null) {
        window.postMessage(failureMessage(failure), '/');
      }
    })();
  }
});
