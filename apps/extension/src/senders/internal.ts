export const isInternalSender = (sender: chrome.runtime.MessageSender): boolean =>
  sender.origin === origin && sender.id === chrome.runtime.id;
