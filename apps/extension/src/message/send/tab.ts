import { PraxConnection } from '../../content-scripts/message/prax-connection';
import { suppressChromeResponderDroppedError } from '../../utils/chrome-errors';
import { uniqueTabs } from '../../senders/unique-tabs';

export const sendTab = async (
  target: chrome.runtime.MessageSender,
  message: PraxConnection,
): Promise<null> => {
  const { documentId, frameId } = target;

  if (target.tab?.id == null) {
    throw new ReferenceError('Target is not a tab', { cause: target });
  }

  const response: unknown = await chrome.tabs
    .sendMessage(target.tab.id, message, { documentId, frameId })
    .catch(suppressChromeResponderDroppedError);

  if (response != null) {
    throw new Error('Unexpected response from tab', {
      cause: { target, message, response },
    });
  }

  return null;
};

export const sendTabs = (
  targets: Iterable<chrome.runtime.MessageSender>,
  message: PraxConnection,
) => Array.from(uniqueTabs(targets)).map(t => sendTab(t, message));
