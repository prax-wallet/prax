import { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import { CRSessionClient } from '@penumbra-zone/transport-chrome/session-client';
import { PraxConnection } from './message/prax-connection';
import { isPraxMessageEvent, unwrapPraxMessageEvent } from './message/prax-message-event';
import { sendBackground } from './message/send-background';
import { sendWindow } from './message/send-window';

const failureMessage = (failure: unknown): PenumbraRequestFailure =>
  typeof failure === 'string' && failure in PenumbraRequestFailure
    ? (failure as PenumbraRequestFailure)
    : PenumbraRequestFailure.BadResponse;

const praxDocumentListener = (ev: MessageEvent<unknown>) => {
  if (ev.origin === window.origin && isPraxMessageEvent(ev)) {
    const eventContent = unwrapPraxMessageEvent(ev);
    if (typeof eventContent === 'string' && eventContent in PraxConnection) {
      const request = PraxConnection[eventContent as PraxConnection];
      switch (request) {
        case PraxConnection.Connect:
        case PraxConnection.Disconnect:
          ev.stopPropagation();
          void sendBackground(request).then(response => {
            if (response != null) {
              sendWindow(failureMessage(response));
            }
          });
          break;
        default: // message is not for this handler
          return;
      }
    }
  }
};

const praxExtensionListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  ok: (no?: never) => void,
) => {
  if (sender.id === PRAX && typeof message === 'string' && message in PraxConnection) {
    const control = PraxConnection[message as PraxConnection];
    switch (control) {
      case PraxConnection.Init: {
        const port = CRSessionClient.init(PRAX);
        sendWindow(port);
        break;
      }
      case PraxConnection.End: {
        CRSessionClient.end(PRAX);
        sendWindow(PraxConnection.End);
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
void sendBackground(PraxConnection.Init);
