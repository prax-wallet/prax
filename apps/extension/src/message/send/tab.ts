import { PraxConnection } from '../../content-scripts/message/prax-connection';
import { suppressChromeResponderDroppedError } from '../../utils/chrome-errors';
import { uniqueTabs } from '../../senders/unique-tabs';

export const sendTab = async (
  target: chrome.runtime.MessageSender,
  message: PraxConnection,
): Promise<null> => {
  const { documentId, frameId, tab } = target;

  const response: unknown = await chrome.tabs
    .sendMessage(tab!.id!, message, { documentId, frameId })
    .catch(suppressChromeResponderDroppedError);

  if (response != null) {
    throw new TypeError('Unexpected response from tab', {
      cause: { target, message, response },
    });
  }

  return null;
};

export function* sendTabs(
  targets: Iterable<chrome.runtime.MessageSender>,
  message: PraxConnection,
) {
  for (const target of uniqueTabs(targets)) {
    yield sendTab(target, message);
  }
}
