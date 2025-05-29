import { CRSessionClient } from '@penumbra-zone/transport-chrome/session-client';
import { PraxConnection } from './message/prax-connection';
import { PraxMessageEvent, unwrapPraxMessageEvent } from './message/prax-message-event';
import { listenBackground, sendBackground } from './message/send-background';
import { listenWindow, sendWindow } from './message/send-window';
import { PenumbraRequestFailure } from '@penumbra-zone/client/error';

const praxDocumentListener = (ev: PraxMessageEvent): boolean => {
  const request = unwrapPraxMessageEvent(ev);
  switch (request) {
    case PraxConnection.Load:
    case PraxConnection.Connect:
    case PraxConnection.Disconnect:
      ev.stopImmediatePropagation();
      void sendBackground(request).then(response => {
        if (response != null) {
          sendWindow<PenumbraRequestFailure>(response);
        }
      });
      return true;
    default: // message is not for this handler
      return false;
  }
};

const praxExtensionListener = (message: unknown): void | Promise<null> => {
  switch (message) {
    case PraxConnection.Init:
      sendWindow<MessagePort>(CRSessionClient.init(PRAX));
      break;
    case PraxConnection.End:
      CRSessionClient.end(PRAX);
      sendWindow<PraxConnection>(PraxConnection.End);
      break;
    case PraxConnection.Preconnect:
      sendWindow<PraxConnection>(message);
      break;
    default: // message is not for this handler
      return;
  }

  return Promise.resolve(null);
};

listenWindow(undefined, praxDocumentListener);
listenBackground<null>(undefined, praxExtensionListener);
