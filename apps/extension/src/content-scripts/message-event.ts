import { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import { PraxConnection } from '../message/prax';

// @ts-expect-error - ts can't understand the injected string
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PraxMessage<T = unknown> = { [PRAX]: T };
export type PraxMessageEvent<T = unknown> = MessageEvent<PraxMessage<T>>;

export const unwrapPraxMessageEvent = <T>(ev: PraxMessageEvent<T>): T =>
  // @ts-expect-error - ts can't understand the injected string
  ev.data[PRAX] as T;

export const isPraxMessageEvent = (ev: MessageEvent<unknown>): ev is PraxMessageEvent =>
  typeof ev.data === 'object' && ev.data !== null && PRAX in ev.data;

export const isPraxPortMessageEvent = (
  ev: MessageEvent<unknown>,
): ev is PraxMessageEvent<MessagePort> =>
  isPraxMessageEvent(ev) && unwrapPraxMessageEvent(ev) instanceof MessagePort;

export const isPraxConnectMessageEvent = (
  ev: MessageEvent<unknown>,
): ev is PraxMessageEvent<PraxConnection.Connect> =>
  isPraxMessageEvent(ev) && unwrapPraxMessageEvent(ev) === PraxConnection.Connect;

export const isPraxInitMessageEvent = (
  ev: MessageEvent<unknown>,
): ev is PraxMessageEvent<PraxConnection.Init> =>
  isPraxMessageEvent(ev) && unwrapPraxMessageEvent(ev) === PraxConnection.Init;

export const isPraxEndMessageEvent = (
  ev: MessageEvent<unknown>,
): ev is PraxMessageEvent<PraxConnection.End> =>
  isPraxMessageEvent(ev) && unwrapPraxMessageEvent(ev) === PraxConnection.End;

export const isPraxDisconnectMessageEvent = (
  ev: MessageEvent<unknown>,
): ev is PraxMessageEvent<PraxConnection.Disconnect> =>
  isPraxMessageEvent(ev) && unwrapPraxMessageEvent(ev) === PraxConnection.Disconnect;

export const isPraxFailureMessageEvent = (
  ev: MessageEvent<unknown>,
): ev is PraxMessageEvent<PenumbraRequestFailure> =>
  isPraxMessageEvent(ev) &&
  typeof unwrapPraxMessageEvent(ev) === 'string' &&
  unwrapPraxMessageEvent<string>(ev) in PenumbraRequestFailure;
