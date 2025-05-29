import type { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import type { PraxConnection } from './prax-connection';

export const sendWindow = <P extends PraxConnection | PenumbraRequestFailure | MessagePort>(
  message: P,
) =>
  window.postMessage(
    { [PRAX]: message } satisfies Record<typeof PRAX, P>,
    '/', // restrict target origin to the same window
    message instanceof MessagePort ? [message] : [],
  );
