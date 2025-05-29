import { CRSessionClient } from '@penumbra-zone/transport-chrome/session-client';
import { isPraxConnection, PraxConnection } from './message/prax-connection';
import { unwrapPraxMessageEvent } from './message/prax-message-event';
import { listenBackground, sendBackground } from './message/send-background';
import { listenWindow, sendWindow } from './message/send-window';
import { PenumbraRequestFailure } from '@penumbra-zone/client/error';

listenWindow(undefined, ev => {
  const request = unwrapPraxMessageEvent(ev);
  switch (request) {
    case PraxConnection.Connect:
    case PraxConnection.Disconnect:
      ev.stopImmediatePropagation();
      void sendBackground(request).then(response => {
        if (response != null) {
          sendWindow<PenumbraRequestFailure>(response);
        }
      });
      break;
    default: // message is not for this handler
      return;
  }
});

listenBackground<null>(undefined, (message: unknown) => {
  if (!isPraxConnection(message)) {
    return;
  }

  switch (message) {
    case PraxConnection.Init:
      sendWindow<MessagePort>(CRSessionClient.init(PRAX));
      break;
    case PraxConnection.End:
      CRSessionClient.end(PRAX);
      sendWindow<PraxConnection>(PraxConnection.End);
      break;
    default: // message is not for this handler
      return;
  }

  return Promise.resolve(null);
});

// announce
void sendBackground(PraxConnection.Init).then(response => {
  if (response != null) {
    sendWindow<PenumbraRequestFailure>(response);
  }
});
