import { PraxControl } from '../../content-scripts/message/prax-control';
import { uniqueTabs } from '../../senders/unique-tabs';
import { suppressChromeResponderDroppedError } from '../../utils/chrome-errors';

export const sendTab = async (
  target: chrome.runtime.MessageSender,
  message: PraxControl,
): Promise<null> => {
  const { documentId, tab } = target;

  if (tab?.id == null || documentId == null) {
    throw new TypeError('Nonspecific target missing tab or document id', {
      cause: { target, message },
    });
  }

  if (globalThis.__DEV__) {
    console.debug('sendTab', message, target.origin, { target, message });
  }

  const response = await chrome.tabs
    .sendMessage<PraxControl, unknown>(tab.id, message, { documentId })
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

export function* sendTabs(targets: Iterable<chrome.runtime.MessageSender>, message: PraxControl) {
  for (const target of uniqueTabs(targets)) {
    yield sendTab(target, message);
  }
}
