import { PenumbraRequestFailure } from '@penumbra-zone/client';
import { PraxConnection } from './prax-connection';
import { prerendering } from './prerendering';

/**
 * Private lock, only shared locally among importers in the same runtime.
 * @note Can't use `navigator.locks` because it would escape the content script.
 */
let lock: Promise<null | PenumbraRequestFailure> = Promise.resolve(null);
let steal = new AbortController();

/**
 * Send a connection lifecycle message to the extension service worker.
 *
 * @note not async to avoid reentrancy
 */
export const sendBackground = (message: PraxConnection): Promise<null | PenumbraRequestFailure> => {
  // disconnect can jump the queue
  if (message === PraxConnection.Disconnect) {
    steal.abort();
    steal = new AbortController();
  }

  // capture present signal within the closure
  const stolen = steal.signal;

  return (lock = // update the lock
    // wait for turn without failure
    lock.catch().then(() => {
      stolen.throwIfAborted();
      return innerSendBackground(message);
    }));
};

const innerSendBackground = async (
  message: PraxConnection,
): Promise<null | PenumbraRequestFailure> => {
  await prerendering;
  try {
    const praxResponse: unknown = await chrome.runtime.sendMessage(message);

    if (praxResponse == null) {
      return null;
    }

    switch (
      typeof praxResponse === 'string' &&
      praxResponse in PenumbraRequestFailure &&
      (praxResponse as PenumbraRequestFailure)
    ) {
      case false:
        throw new TypeError('Unknown response from Prax', { cause: praxResponse });
      case PenumbraRequestFailure.Denied:
      case PenumbraRequestFailure.NeedsLogin:
        return praxResponse as PenumbraRequestFailure;
      default:
        throw new TypeError('Unexpected response from Prax', { cause: praxResponse });
    }
  } catch (e) {
    const fallback =
      e instanceof TypeError
        ? PenumbraRequestFailure.BadResponse
        : PenumbraRequestFailure.NotHandled;
    if (globalThis.__DEV__) {
      console.error('sendBackground', fallback, e);
    }
    return fallback;
  }
};
