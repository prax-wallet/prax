export const isInternalServiceWorkerSender = (
  sender?: chrome.runtime.MessageSender,
): sender is InternalServiceWorkerSender => {
  // all internal senders will possess the extension id
  if (sender?.id !== PRAX) {
    return false;
  }

  // extension workers...
  // - don't have a documentId
  // - and aren't in a tab
  // - but do have a url
  if (!sender.documentId && !sender.tab && sender.url) {
    try {
      // so check the url's origin
      return new URL(sender.url).origin === PRAX_ORIGIN;
    } catch (e) {
      console.error('Failed to parse sender URL', e, sender);
      return false;
    }
  }

  // anything else
  return false;
};

export const isInternalDocumentSender = (
  sender?: chrome.runtime.MessageSender,
): sender is InternalDocumentSender => {
  if (!sender?.documentId) {
    return false;
  }

  // all internal senders will possess the extension id
  if (sender.id !== PRAX) {
    return false;
  }
  // but so will content scripts, so there's more to check.

  // all extension pages have the extension origin
  return sender.origin === PRAX_ORIGIN;
};

export const isInternalSender = (
  sender?: chrome.runtime.MessageSender,
): sender is InternalSender => {
  // all internal senders will possess the extension id
  if (sender?.id !== PRAX) {
    return false;
  }
  // but so will content scripts, so there's more to check.

  // all extension pages have the extension origin,
  if (sender.origin) {
    return sender.origin === PRAX_ORIGIN;
  }
  // but extension workers don't have any origin, so there's more to check.

  // extension workers...
  // - don't have a documentId
  // - and aren't in a tab
  // - but do have a url
  if (!sender.documentId && !sender.tab && sender.url) {
    try {
      // so check the url's origin
      return new URL(sender.url).origin === PRAX_ORIGIN;
    } catch (e) {
      console.error('Failed to parse sender URL', e, sender);
      return false;
    }
  }

  // anything else
  return false;
};

export type InternalServiceWorkerSender = chrome.runtime.MessageSender & {
  id: typeof PRAX;
  url: `${typeof PRAX_ORIGIN}/${string}`;
};

export type InternalDocumentSender = chrome.runtime.MessageSender & {
  id: typeof PRAX;
  url: `${typeof PRAX_ORIGIN}/${string}`;
  origin: typeof PRAX_ORIGIN;
  documentId: string;
};

export type InternalSender = chrome.runtime.MessageSender & {
  id: typeof PRAX;
  url: `${typeof PRAX_ORIGIN}/${string}`;
  origin?: typeof PRAX_ORIGIN;
};
