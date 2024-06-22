import { PraxMessage } from './message-event';
import { CRSessionClient } from '@penumbra-zone/transport-chrome/session-client';
import { PraxConnection } from '../message/prax';

// content script unconditionally announces itself to extension background.
void chrome.runtime.sendMessage(PraxConnection.Init);

// listen for init command from background. this may arrive soon after announce,
// or much later, after a request is made.  this activates the channel session
// that transports messages from the DOM channel into the Chrome runtime
const initOnce = (
  req: unknown,
  // in a content script, sender is always an extension background script
  _: chrome.runtime.MessageSender,
  // this handler will only ever send an empty response
  emptyResponse: (no?: never) => void,
) => {
  if (req !== PraxConnection.Init) return false;

  chrome.runtime.onMessage.removeListener(initOnce);

  // create session, post port to window where the injected global can catch it
  const port = CRSessionClient.init(PRAX);
  window.postMessage({ [PRAX]: port } satisfies PraxMessage<MessagePort>, '/', [port]);

  emptyResponse();
  return true;
};

chrome.runtime.onMessage.addListener(initOnce);
