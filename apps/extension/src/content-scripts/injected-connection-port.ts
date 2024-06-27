import { CRSessionClient } from '@penumbra-zone/transport-chrome/session-client';
import { PraxConnection } from '../message/prax';
import { PraxMessage } from './message-event';

// this script will init the page session upon instruction from an extension
// worker. init does not arrive in direct response to an emitted message, it is
// independent.

// handler to listen for init command for this document
const initOnce = (
  req: unknown,
  // content script message handlers are activated only by another
  // script in the same extension using chrome.tabs.sendMessage
  sender: chrome.runtime.MessageSender,
  // this handler will only ever send an empty response
  respond: (no?: never) => void,
) => {
  if (req !== PraxConnection.Init) {
    // boolean return in handlers signals intent to respond
    return false;
  }

  chrome.runtime.onMessage.removeListener(initOnce);

  if (sender.id !== PRAX) {
    throw new Error(`Unexpected sender ${sender.id}`);
  }

  // create session, post port to window where the injected global can catch it.
  const port = CRSessionClient.init(PRAX);
  window.postMessage({ [PRAX]: port } satisfies PraxMessage<MessagePort>, '/', [port]);

  // handler is done
  respond();

  // boolean return in handlers signals intent to respond
  return true;
};

// attach handler
chrome.runtime.onMessage.addListener(initOnce);

// announce
void chrome.runtime.sendMessage(PraxConnection.Init);
