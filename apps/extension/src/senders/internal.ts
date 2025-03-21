export const isInternalSender = (
  sender?: chrome.runtime.MessageSender,
): sender is InternalSender => {
  if (sender?.id === chrome.runtime.id) {
    if (sender.origin) {
      return sender.origin === PRAX_ORIGIN;
    }

    if (sender.url) {
      // extension workers don't have an origin, but do have a url
      try {
        return new URL(sender.url).origin === PRAX_ORIGIN;
      } catch (e) {
        console.error('Failed to parse sender URL', e, sender);
      }
    }
  }

  return false;
};

export type InternalSender = chrome.runtime.MessageSender & {
  id: typeof PRAX;
  url?: `${typeof PRAX_ORIGIN}/${string}`;
  origin?: typeof PRAX_ORIGIN;
};
