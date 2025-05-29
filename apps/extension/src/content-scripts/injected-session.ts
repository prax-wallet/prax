import { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import { CRSessionClient } from '@penumbra-zone/transport-chrome/session-client';
import { isPraxConnection } from './message/prax-connection';
import { isPraxControl, PraxControl } from './message/prax-control';
import { PraxMessageEvent, unwrapPraxMessageEvent } from './message/prax-message-event';
import { listenBackground, sendBackground } from './message/send-background';
import { listenWindow, sendWindow } from './message/send-window';

const praxDocumentListener = (ev: PraxMessageEvent): void => {
  const request = unwrapPraxMessageEvent(ev);
  if (isPraxConnection(request)) {
    ev.stopImmediatePropagation();
    void sendBackground(request).then(response => {
      if (response != null) {
        sendWindow<PenumbraRequestFailure>(response);
      }
    });
  }
};

const praxExtensionListener = (message: unknown, responder: (response: null) => void): boolean => {
  if (!isPraxControl(message)) {
    return false;
  }

  switch (message) {
    case PraxControl.Init:
      sendWindow<MessagePort>(CRSessionClient.init(PRAX));
      break;
    case PraxControl.End:
      CRSessionClient.end(PRAX);
      sendWindow<PraxControl>(PraxControl.End);
      break;
    case PraxControl.Preconnect:
      sendWindow<PraxControl>(PraxControl.Preconnect);
      break;
  }
  responder(null);

  return true;
};

listenWindow(undefined, praxDocumentListener);
listenBackground<null>(undefined, praxExtensionListener);
