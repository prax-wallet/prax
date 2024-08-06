import { CRSessionClient } from '@penumbra-zone/transport-chrome/session-client';
import { PraxConnection } from '../message/prax';
import { isPraxInitMessageEvent, PraxMessage } from './message-event';

const end = { [PRAX]: PraxConnection.End } satisfies PraxMessage<PraxConnection.End>;

let port: MessagePort | undefined;

const initListener = (event: MessageEvent<unknown>) => {
  if (event.origin !== '/') {
    if (isPraxInitMessageEvent(event)) {
      window.removeEventListener('message', initListener);
      if (port) {
        window.postMessage({ [PRAX]: port } satisfies PraxMessage<MessagePort>, '/', [port]);
      }
    }
  }
};

window.addEventListener('message', initListener);

chrome.runtime.onMessage.addListener(
  (req: unknown, sender: chrome.runtime.MessageSender, respond: (no?: never) => void) => {
    if (typeof req === 'string' && req in PraxConnection) {
      if (sender.id !== PRAX) {
        throw new Error(`Unexpected sender ${sender.id}`);
      }
      switch (req as PraxConnection) {
        case PraxConnection.Init: {
          port ??= CRSessionClient.init(PRAX);
          window.postMessage({ [PRAX]: port } satisfies PraxMessage<MessagePort>, '/', [port]);
          respond();
          return true;
        }
        case PraxConnection.End: {
          port = undefined;
          window.postMessage(end, '/');
          respond();
          return true;
        }
        default:
          return false;
      }
    }
    return false;
  },
);

// announce
void chrome.runtime.sendMessage(PraxConnection.Init);
