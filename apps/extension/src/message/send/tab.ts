import { PraxConnection } from '../../content-scripts/message/prax-connection';
import { suppressChromeResponderDroppedError } from '../../utils/chrome-errors';
import { uniqueTabs } from '../../senders/unique-tabs';

export const sendTab = async (
  sender: chrome.runtime.MessageSender,
  message: PraxConnection,
): Promise<null> => {
  const { documentId, frameId } = sender;

  const response: unknown = await chrome.tabs
    .sendMessage(sender.tab!.id!, message, { documentId, frameId })
    .catch(suppressChromeResponderDroppedError);

  if (response != null) {
    throw new Error('Unexpected response from tab', { cause: { sender, message, response } });
  }

  return null;
};

export const sendTabs = (
  senders: Iterable<chrome.runtime.MessageSender>,
  message: PraxConnection,
) => Array.from(uniqueTabs(senders)).map(sender => sendTab(sender, message));
