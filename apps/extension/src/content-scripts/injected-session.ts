import { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import { CRSessionClient } from '@penumbra-zone/transport-chrome/session-client';
import { isPraxConnection } from './message/prax-connection';
import { isPraxControl, PraxControl } from './message/prax-control';
import { PraxMessageEvent, unwrapPraxMessageEvent } from './message/prax-message-event';
import { listenBackground, sendBackground } from './message/send-background';
import { listenWindow, sendWindow } from './message/send-window';

const praxDocumentListener = (ev: PraxMessageEvent): boolean => {
  const request = unwrapPraxMessageEvent(ev);
  if (!isPraxConnection(request)) {
    return false;
  }

  ev.stopImmediatePropagation();
  void sendBackground(request).then(response => {
    if (response != null) {
      sendWindow<PenumbraRequestFailure>(response);
    }
  });
  return true;
};

const praxExtensionListener = (message: unknown): void | Promise<null> => {
  if (!isPraxControl(message)) {
    return;
  }

  let forward: PraxControl | MessagePort;
  switch (message) {
    case PraxControl.Init:
      forward = CRSessionClient.init(PRAX);
      break;
    case PraxControl.End:
      CRSessionClient.end(PRAX);
      forward = PraxControl.End;
      break;
    case PraxControl.Preconnect:
      forward = PraxControl.Preconnect;
      break;
  }
  sendWindow<PraxControl | MessagePort>(forward);

  return Promise.resolve(null);
};

listenWindow(undefined, praxDocumentListener);
listenBackground<null>(undefined, praxExtensionListener);
