import { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import type { PraxConnection } from './prax-connection';

export const sendBackground = async (
  message: PraxConnection,
): Promise<null | PenumbraRequestFailure> => {
  try {
    const response: unknown = await chrome.runtime.sendMessage(message);

    switch (response) {
      case undefined:
        throw new ReferenceError('No response');
      case null:
      case PenumbraRequestFailure.Denied:
      case PenumbraRequestFailure.NeedsLogin:
        return response;
      default:
        throw new TypeError('Unexpected response', { cause: response });
    }
  } catch (error) {
    const fallback =
      error instanceof TypeError
        ? PenumbraRequestFailure.BadResponse
        : PenumbraRequestFailure.NotHandled;
    if (globalThis.__DEV__) {
      console.error('sendBackground', { fallback, message, error });
    }
    return fallback;
  }
};
