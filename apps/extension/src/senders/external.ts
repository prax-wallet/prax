type ValidProtocol = 'https:';
const validProtocols: ValidProtocol[] = ['https:'];

type URLValidProtocol = URL & { protocol: ValidProtocol };
type URLHttpLocalhost = URL & { protocol: 'http:'; hostname: 'localhost' };

export type ValidExternalSender = chrome.runtime.MessageSender & {
  documentLifecycle: 'active';
  frameId: 0;
  documentId: string;
  tab: chrome.tabs.Tab & { id: number };
  origin: string;
  url: string;
};

const isHttps = (url: URL): url is URLValidProtocol =>
  typeof url.protocol === 'string' && (validProtocols as string[]).includes(url.protocol);

const isHttpLocalhost = (url: URL): url is URLHttpLocalhost =>
  url.protocol === 'http:' && url.hostname === 'localhost';

/**
 * Checks the sender is an active document in the top-level frame of a tab.
 */
export const isValidExternalSender = (
  sender?: chrome.runtime.MessageSender,
): sender is ValidExternalSender => {
  try {
    assertValidExternalSender(sender);
    return true;
  } catch {
    return false;
  }
};

/**
 * Asserts the sender is an active document in the top-level frame of a tab.
 */
export function assertValidExternalSender(
  sender?: chrome.runtime.MessageSender,
): asserts sender is ValidExternalSender {
  if (sender == null) {
    throw new ReferenceError('Sender undefined', { cause: sender });
  }
  if (!sender.tab?.id) {
    throw new TypeError('Sender is not a tab', { cause: sender });
  }
  if (!sender.documentId) {
    throw new TypeError('Sender is not a document', { cause: sender });
  }
  if (sender.documentLifecycle !== 'active') {
    throw new TypeError('Sender is not active', { cause: sender });
  }
  if (sender.frameId !== 0) {
    throw new TypeError('Sender is not a top-level frame', { cause: sender });
  }

  if (!sender.origin) {
    throw new TypeError('Sender has no origin', { cause: sender });
  }
  const parsedOrigin = new URL(sender.origin);
  if (parsedOrigin.origin !== sender.origin) {
    throw new TypeError('Sender origin is invalid');
  }

  if (!isHttps(parsedOrigin) && !isHttpLocalhost(parsedOrigin)) {
    throw new TypeError(`Sender protocol is not ${validProtocols.join(',')}`, { cause: sender });
  }

  if (!sender.url) {
    throw new TypeError('Sender has no URL', { cause: sender });
  }
  const parsedUrl = new URL(sender.url);
  if (parsedUrl.href !== sender.url) {
    throw new TypeError('Sender URL is invalid', { cause: sender });
  }
  if (parsedUrl.origin !== parsedOrigin.origin) {
    throw new TypeError('Sender URL has unexpected origin', { cause: sender });
  }
}
