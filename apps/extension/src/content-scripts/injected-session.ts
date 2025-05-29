import { CRSessionClient } from '@penumbra-zone/transport-chrome/session-client';
import { isPraxConnection, PraxConnection } from './message/prax-connection';
import { isPraxMessageEvent, unwrapPraxMessageEvent } from './message/prax-message-event';
import { sendBackground } from './message/send-background';
import { sendWindow } from './message/send-window';

const praxDocumentListener = (ev: MessageEvent<unknown>) => {
  if (ev.origin === window.origin && isPraxMessageEvent(ev)) {
    const request = unwrapPraxMessageEvent(ev);
    switch (request) {
      case PraxConnection.Connect:
      case PraxConnection.Disconnect:
        ev.stopPropagation();
        void sendBackground(request).then(response => {
          if (response != null) {
            sendWindow(response);
          }
        });
        break;
      default: // message is not for this handler
        return;
    }
  }
};

const praxExtensionListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  ok: (no?: never) => void,
) => {
  if (sender.id === PRAX && isPraxConnection(message)) {
    switch (message) {
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
  }
  // message is not for this handler
  return false;
};

// attach
window.addEventListener('message', praxDocumentListener);
chrome.runtime.onMessage.addListener(praxExtensionListener);

// announce
void sendBackground(PraxConnection.Init).then(response => {
  if (response != null) {
    sendWindow(response);
  }
});
