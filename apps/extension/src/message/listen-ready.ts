import { isInternalSender } from '../senders/internal';

export const listenReady = <I extends string>(id: I, signal?: AbortSignal): Promise<I> => {
  const { promise: ready, resolve, reject } = Promise.withResolvers<I>();

  const listener = (
    msg: unknown,
    sender: chrome.runtime.MessageSender,
    respond: (response: null) => void,
  ): boolean => {
    if (isInternalSender(sender) && id === msg) {
      resolve(id);
      respond(null);
      return true;
    }
    return false;
  };

  signal?.addEventListener('abort', () => reject(signal.reason));

  chrome.runtime.onMessage.addListener(listener);
  return ready.finally(() => chrome.runtime.onMessage.removeListener(listener));
};
