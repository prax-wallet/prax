const chromeResponderDroppedMessage =
  'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received';

export const isChromeResponderDroppedError = (
  e: unknown,
): e is Error & { message: typeof chromeResponderDroppedMessage } =>
  e instanceof Error && e.message === chromeResponderDroppedMessage;

export const suppressChromeResponderDroppedError = (e: unknown) => {
  if (isChromeResponderDroppedError(e)) {
    return null;
  } else {
    throw e;
  }
};
