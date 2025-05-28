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

export type PrerenderingExternalSender = chrome.runtime.MessageSender & {
  documentLifecycle: 'prerender';
  frameId: Exclude<number, 0>;
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
  } catch (invalid) {
    console.debug(invalid);
    return false;
  }
};

/**
 * Checks the sender is a prerendering document that is otherwise valid.
 */
export const isPrerenderingExternalSender = (
  sender?: chrome.runtime.MessageSender,
): sender is PrerenderingExternalSender => {
  try {
    assertPrerenderingSender(sender);
    return true;
  } catch (invalid) {
    console.debug(invalid);
    return false;
  }
};

/**
 * Asserts the sender is an active document in the top-level frame of a tab.
 */
export function assertValidExternalSender(
  sender?: chrome.runtime.MessageSender,
): asserts sender is ValidExternalSender {
  assertSenderCommon(sender);
  if (sender.documentLifecycle !== 'active') {
    throw new TypeError('Sender is not an active document', { cause: sender });
  }
  if (sender.frameId !== 0) {
    throw new TypeError('Sender is not a top-level frame', { cause: sender });
  }
}

/**
 * Asserts the sender is a prerendering document that is otherwise valid.
 */
export function assertPrerenderingSender(
  sender?: chrome.runtime.MessageSender,
): asserts sender is PrerenderingExternalSender {
  assertSenderCommon(sender);
  if (sender.documentLifecycle !== 'prerender') {
    throw new TypeError('Sender is not a prerendering document', { cause: sender });
  }
  if (!sender.frameId) {
    throw new TypeError('Sender is not a prerendering frame', { cause: sender });
  }
}

function assertSenderCommon(
  sender?: chrome.runtime.MessageSender,
): asserts sender is chrome.runtime.MessageSender &
  Required<Pick<chrome.runtime.MessageSender, 'tab' | 'documentId' | 'origin' | 'url'>> {
  if (sender == null) {
    throw new ReferenceError('Sender undefined', { cause: sender });
  }
  if (!sender.tab?.id) {
    throw new TypeError('Sender is not a tab', { cause: sender });
  }
  if (!sender.documentId) {
    throw new TypeError('Sender is not a document', { cause: sender });
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
