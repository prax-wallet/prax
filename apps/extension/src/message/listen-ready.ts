import { isValidInternalSender } from '../senders/internal';

export const listenReady = <I extends string>(id: I, signal?: AbortSignal): Promise<I> => {
  const { promise: ready, resolve, reject } = Promise.withResolvers<I>();

  const listener = (
    msg: unknown,
    sender: chrome.runtime.MessageSender,
    respond: (response: null) => void,
  ): boolean => {
    if (!isValidInternalSender(sender) || id !== msg) {
      return false;
    }
    resolve(id);
    respond(null);
    return true;
  };

  signal?.addEventListener('abort', () => reject(signal.reason));

  chrome.runtime.onMessage.addListener(listener);
  return ready.finally(() => chrome.runtime.onMessage.removeListener(listener));
};
