import { PraxMessage, isPraxRequestMessageEvent } from './message-event';
import { PraxConnection } from '../message/prax';
import { PenumbraRequestFailure } from '@penumbra-zone/client';

const handleRequest = (ev: MessageEvent<unknown>) => {
  if (ev.origin === window.origin && isPraxRequestMessageEvent(ev)) {
    void (async () => {
      window.removeEventListener('message', handleRequest);

      // any response to this message only indicates failure.  success is
      // resolved upon successful connection, and those messages are handled by
      // the script in injected-connection-port
      const failure = await chrome.runtime.sendMessage<
        PraxConnection,
        undefined | PenumbraRequestFailure
      >(PraxConnection.Request);
      if (failure)
        window.postMessage({ [PRAX]: failure } satisfies PraxMessage<PenumbraRequestFailure>, '/');
    })();
  }
};

window.addEventListener('message', handleRequest);
