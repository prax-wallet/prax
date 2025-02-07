export const isInternalSender = (
  sender?: chrome.runtime.MessageSender,
): sender is InternalSender => {
  if (sender?.origin && sender.id === chrome.runtime.id) {
    const senderUrl = new URL(sender.origin);
    return senderUrl.protocol === 'chrome-extension:' && senderUrl.host === chrome.runtime.id;
  }
  return false;
};

export type InternalSender = chrome.runtime.MessageSender & {
  origin: string;
  id: string;
};
