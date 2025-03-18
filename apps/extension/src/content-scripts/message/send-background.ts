import { PenumbraRequestFailure } from '@penumbra-zone/client';
import type { PraxConnection } from './prax-connection';

export const sendBackground = async (
  message: PraxConnection,
): Promise<null | PenumbraRequestFailure> => {
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
