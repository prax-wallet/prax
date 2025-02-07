const validProtocols = ['https:'];

export type ValidSender = chrome.runtime.MessageSender & {
  frameId: 0;
  documentId: string;
  tab: chrome.tabs.Tab & { id: number };
  origin: string;
  url: string;
};

const isHttpLocalhost = (url: URL): boolean =>
  url.protocol === 'http:' && url.hostname === 'localhost';

export const assertValidSender = (sender?: chrome.runtime.MessageSender): ValidSender => {
  if (!sender) {
    throw new Error('Sender undefined');
  }
  if (!sender.tab?.id) {
    throw new Error('Sender is not a tab');
  }
  if (sender.frameId !== 0) {
    throw new Error('Sender is not a top-level frame');
  }
  if (!sender.documentId) {
    throw new Error('Sender is not a document');
  }

  if (!sender.origin) {
    throw new Error('Sender has no origin');
  }
  const parsedOrigin = new URL(sender.origin);
  if (parsedOrigin.origin !== sender.origin) {
    throw new Error('Sender origin is invalid');
  }

  if (!validProtocols.includes(parsedOrigin.protocol)) {
    if (isHttpLocalhost(parsedOrigin)) {
      console.warn('Allowing http at localhost', parsedOrigin);
    } else {
      throw new Error(`Sender protocol is not ${validProtocols.join(',')}`);
    }
  }

  if (!sender.url) {
    throw new Error('Sender has no URL');
  }
  const parsedUrl = new URL(sender.url);
  if (parsedUrl.href !== sender.url) {
    throw new Error('Sender URL is invalid');
  }
  if (parsedUrl.origin !== parsedOrigin.origin) {
    throw new Error('Sender URL has unexpected origin');
  }

  return sender as ValidSender;
};
