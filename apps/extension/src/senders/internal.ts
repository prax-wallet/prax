export const isInternalSender = (
  sender?: chrome.runtime.MessageSender,
): sender is InternalSender => {
  if (sender?.url && sender.id === chrome.runtime.id) {
    const senderUrl = new URL(sender.url);
    return senderUrl.protocol === 'chrome-extension:' && senderUrl.host === chrome.runtime.id;
  }
  return false;
};

export type InternalSender = chrome.runtime.MessageSender & {
  origin: string;
  id: string;
};
