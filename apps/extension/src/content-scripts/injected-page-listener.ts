import {
  PraxMessage,
  isPraxConnectMessageEvent,
  isPraxDisconnectMessageEvent,
} from './message-event';
import { PraxConnection } from '../message/prax';
import { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import { CRSessionClient } from '@penumbra-zone/transport-chrome/session-client';

const endMessage = { [PRAX]: PraxConnection.End } satisfies PraxMessage<PraxConnection.End>;

let port: MessagePort | undefined;

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

        if (failure == null) {
          port ??= CRSessionClient.init(PRAX);
          window.postMessage({ [PRAX]: port } satisfies PraxMessage<MessagePort>, '/', [port]);
        }
      } else if (isPraxDisconnectMessageEvent(ev)) {
        port = undefined;

        try {
          failure = await chrome.runtime.sendMessage(PraxConnection.Disconnect);
        } catch (e) {
          console.error(e);
          failure = PenumbraRequestFailure.NotHandled;
        }

        if (failure == null) {
          window.postMessage(endMessage, '/');
        }
      }

      if (failure != null) {
        window.postMessage(failureMessage(failure), '/');
      }
    })();
  }
});
