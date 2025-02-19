import { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import { CRSessionClient } from '@penumbra-zone/transport-chrome/session-client';
import { PraxConnection } from '../message/prax';
import { PraxMessage, isPraxMessageEvent, unwrapPraxMessageEvent } from './message-event';

const endMessage = { [PRAX]: PraxConnection.End } satisfies PraxMessage<PraxConnection.End>;
const portMessage = (port: MessagePort) => ({ [PRAX]: port }) satisfies PraxMessage<MessagePort>;
const requestFailureMessage = (failure?: unknown): PraxMessage<PenumbraRequestFailure> =>
  typeof failure === 'string' && failure in PenumbraRequestFailure
    ? { [PRAX]: failure }
    : { [PRAX]: PenumbraRequestFailure.BadResponse };

const praxRequest = async (req: PraxConnection.Connect | PraxConnection.Disconnect) => {
  console.debug('praxRequest req', req);
  const res = await chrome.runtime
    .sendMessage<
      PraxConnection.Connect | PraxConnection.Disconnect,
      null | PenumbraRequestFailure
    >(req)
    .catch(e => {
      console.debug('praxRequest error', e);
      return PenumbraRequestFailure.NotHandled;
    });
  console.debug('praxRequest res', res);
  return res;
};

const praxDocumentListener = (ev: MessageEvent<unknown>) => {
  if (ev.origin === window.origin && isPraxMessageEvent(ev)) {
    const req = unwrapPraxMessageEvent(ev);
    if (typeof req === 'string' && req in PraxConnection) {
      console.debug('window event', req);

      void (async () => {
        let response: unknown;

        switch (req as PraxConnection) {
          case PraxConnection.Connect:
            console.debug('using window event', PraxConnection.Connect);
            response = await praxRequest(PraxConnection.Connect);
            break;
          case PraxConnection.Disconnect:
            console.debug('using window event', PraxConnection.Disconnect);
            response = await praxRequest(PraxConnection.Disconnect);
            break;
          default: // message is not for this handler
            return;
        }

        // response should be null, or content for a failure message
        if (response != null) {
          // failure, send failure message
          console.debug('window event failure', response);
          window.postMessage(requestFailureMessage(response), '/');
        } else {
          // success, no response
          console.debug('window event success');
        }
      })();
    }
  }
};

const praxExtensionListener = (
  req: unknown,
  sender: chrome.runtime.MessageSender,
  ok: (no?: never) => void,
) => {
  if (sender.id === PRAX && typeof req === 'string' && req in PraxConnection) {
    console.debug('extension event', req);

    switch (req as PraxConnection) {
      case PraxConnection.Init: {
        console.debug('using extension event', req);
        const port = CRSessionClient.init(PRAX);
        window.postMessage(portMessage(port), '/', [port]);
        break;
      }
      case PraxConnection.End: {
        console.debug('using extension event', req);
        window.postMessage(endMessage, '/');
        break;
      }
      default: // message is not for this handler
        return false;
    }

    // success, send empty response
    ok();
    return true;
  } else {
    // message is not for this handler
    return false;
  }
};

// attach
window.addEventListener('message', praxDocumentListener);
chrome.runtime.onMessage.addListener(praxExtensionListener);

// announce
void chrome.runtime.sendMessage(PraxConnection.Init);
