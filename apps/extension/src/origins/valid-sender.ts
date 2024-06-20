enum ValidProtocol {
  'https:' = 'https:',
}

type ValidOrigin = `${string & ValidProtocol}//${string}`;

type ValidSender<O extends ValidOrigin> = chrome.runtime.MessageSender &
  Required<{
    frameId: 0;
    documentId: string;
    tab: chrome.tabs.Tab & { id: number };
    origin: O;
    url: `${O}/${string}`;
  }>;

export const assertValidSender = <O extends ValidOrigin>(
  sender?: chrome.runtime.MessageSender & { origin?: O | string },
) => {
  if (!sender) throw new Error('Sender undefined');
  if (!sender.tab?.id) throw new Error('Sender is not a tab');
  if (sender.frameId !== 0) throw new Error('Sender is not a top-level frame');
  if (!sender.documentId) throw new Error('Sender is not a document');

  if (!sender.origin) throw new Error('Sender has no origin');
  const parsedOrigin = new URL(sender.origin);
  if (parsedOrigin.origin !== sender.origin) throw new Error('Sender origin is invalid');
  if (!(parsedOrigin.protocol in ValidProtocol))
    throw new Error(`Sender protocol is not ${Object.values(ValidProtocol).join(',')}`);

  if (!sender.url) throw new Error('Sender has no URL');
  const parsedUrl = new URL(sender.url);
  if (parsedUrl.href !== sender.url) throw new Error('Sender URL is invalid');
  if (parsedUrl.origin !== parsedOrigin.origin) throw new Error('Sender URL has unexpected origin');

  // TODO: use tlsChannelId? is this always available?
  //if (!sender.tlsChannelId) throw new Error('Sender has no tlsChannelId');

  return sender as ValidSender<O>;
};

export const isValidSender = <O extends ValidOrigin>(
  sender: chrome.runtime.MessageSender & { origin?: string | O },
): sender is ValidSender<O> => {
  try {
    return Boolean(assertValidSender(sender));
  } catch {
    return false;
  }
};
