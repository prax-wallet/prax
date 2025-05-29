import { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import type { PraxConnection } from './prax-connection';

export const sendBackground = async (
  request: PraxConnection,
): Promise<null | PenumbraRequestFailure> => {
  try {
    const response = await chrome.runtime.sendMessage<PraxConnection, unknown>(request);

    switch (response) {
      case undefined:
        throw new ReferenceError(`No response to ${request}`);
      case null:
      case PenumbraRequestFailure.Denied:
      case PenumbraRequestFailure.NeedsLogin:
        return response;
      default:
        throw new TypeError(`Unexpected response to ${request}`, { cause: response });
    }
  } catch (error) {
    const fallback =
      error instanceof TypeError
        ? PenumbraRequestFailure.BadResponse
        : PenumbraRequestFailure.NotHandled;
    console.error(error, { fallback, request, error });
    return fallback;
  }
};

export function listenBackground<R = never>(
  signal: AbortSignal | undefined,
  listener: (content: unknown) => void | Promise<NoInfer<R>>,
) {
  const wrappedListener = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    respond: (response: R) => void,
  ): boolean => {
    if (sender.id !== PRAX) {
      return false;
    }

    const handling = listener(message)?.then(respond);
    return !!handling;
  };

  chrome.runtime.onMessage.addListener(wrappedListener);

  signal?.addEventListener('abort', () => chrome.runtime.onMessage.removeListener(wrappedListener));
}
