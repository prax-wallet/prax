import type { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import type { PraxMessage } from './prax-message-event';
import type { PraxConnection } from './prax-connection';

export const sendWindow = <P extends PraxConnection | PenumbraRequestFailure | MessagePort>(
  message: P,
) =>
  window.postMessage(
    { [PRAX]: message } satisfies PraxMessage<P>,
    '/', // restrict target origin to the same window
    message instanceof MessagePort ? [message] : [],
  );
