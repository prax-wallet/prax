import { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import { PraxConnection } from './prax-connection';

export type PraxMessage<T = unknown> = Record<typeof PRAX, T>;
export type PraxMessageEvent<T = unknown> = MessageEvent<PraxMessage<T>>;

export const unwrapPraxMessageEvent = <T>(ev: PraxMessageEvent<T>): T => {
  if (PRAX in ev.data) {
    return ev.data[PRAX] as T;
  }
  throw new TypeError(`MessageEvent data does not contain ${PRAX} field`, { cause: ev });
};

export const isPraxMessageEvent = <T>(
  ev: MessageEvent,
  inner: T | undefined = undefined,
): ev is PraxMessageEvent<T> =>
  ev.data != null &&
  typeof ev.data === 'object' &&
  PRAX in ev.data &&
  (inner === undefined || (ev.data as Record<keyof PraxMessage, unknown>)[PRAX] === inner);

export const isPraxPortMessageEvent = (ev: MessageEvent): ev is PraxMessageEvent<MessagePort> =>
  isPraxMessageEvent(ev) && unwrapPraxMessageEvent(ev) instanceof MessagePort;

export const isPraxConnectMessageEvent = (
  ev: MessageEvent,
): ev is PraxMessageEvent<PraxConnection.Connect> => isPraxMessageEvent(ev, PraxConnection.Connect);

export const isPraxInitMessageEvent = (
  ev: MessageEvent,
): ev is PraxMessageEvent<PraxConnection.Init> => isPraxMessageEvent(ev, PraxConnection.Init);

export const isPraxEndMessageEvent = (
  ev: MessageEvent,
): ev is PraxMessageEvent<PraxConnection.End> => isPraxMessageEvent(ev, PraxConnection.End);

export const isPraxDisconnectMessageEvent = (
  ev: MessageEvent,
): ev is PraxMessageEvent<PraxConnection.Disconnect> =>
  isPraxMessageEvent(ev, PraxConnection.Disconnect);

export const isPraxFailureMessageEvent = <P extends PenumbraRequestFailure>(
  ev: MessageEvent,
  pf: P | undefined = undefined,
): ev is PraxMessageEvent<P> => {
  if (pf !== undefined && !(pf in PenumbraRequestFailure)) {
    throw new TypeError('Second parameter must be PenumbraRequestFailure', { cause: pf });
  }

  if (pf === undefined) {
    if (!isPraxMessageEvent(ev)) {
      return false;
    }
    const content = unwrapPraxMessageEvent(ev);
    return typeof content === 'string' && content in PenumbraRequestFailure;
  }

  return isPraxMessageEvent(ev, pf);
};
