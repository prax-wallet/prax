import { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import type { PraxConnection } from './prax-connection';

export const sendBackground = async (
  message: PraxConnection,
): Promise<null | PenumbraRequestFailure> => {
  try {
    const response: unknown = await chrome.runtime.sendMessage(message);

    switch (response) {
      case null:
      case PenumbraRequestFailure.Denied:
      case PenumbraRequestFailure.NeedsLogin:
        return response;
      default:
        throw new TypeError('Unexpected response from Prax', { cause: response });
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
