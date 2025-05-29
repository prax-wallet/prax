import { PraxConnection } from '../../content-scripts/message/prax-connection';
import { suppressChromeResponderDroppedError } from '../../utils/chrome-errors';
import { uniqueTabs } from '../../senders/unique-tabs';

export const sendTab = async (
  target: chrome.runtime.MessageSender,
  message: PraxConnection,
): Promise<null> => {
  const { documentId, tab } = target;

  if (tab?.id == null || documentId == null) {
    throw new TypeError('Nonspecific target missing tab or document id', {
      cause: { target, message },
    });
  }

  const response = await chrome.tabs
    .sendMessage<PraxConnection, unknown>(tab.id, message, { documentId })
    .catch(suppressChromeResponderDroppedError);

  switch (response) {
    case undefined:
      throw new ReferenceError('No response from tab', { cause: { target, message } });
    case null:
      return response;
    default:
      throw new TypeError('Unexpected response from tab', { cause: { target, message, response } });
  }
};

export function* sendTabs(
  targets: Iterable<chrome.runtime.MessageSender>,
  message: PraxConnection,
) {
  for (const target of uniqueTabs(targets)) {
    yield sendTab(target, message);
  }
}
