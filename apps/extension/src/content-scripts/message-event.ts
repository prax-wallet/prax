import { PenumbraRequestFailure } from '@penumbra-zone/client';
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

export const isPraxRequestMessageEvent = (
  ev: MessageEvent<unknown>,
): ev is PraxMessageEvent<PraxConnection.Request> =>
  isPraxMessageEvent(ev) && unwrapPraxMessageEvent(ev) === PraxConnection.Request;

export const isPraxEndMessageEvent = (
  ev: MessageEvent<unknown>,
): ev is PraxMessageEvent<PraxConnection.Disconnect> =>
  isPraxMessageEvent(ev) && unwrapPraxMessageEvent(ev) === PraxConnection.Disconnect;

export const isPraxFailureMessageEvent = (
  ev: MessageEvent<unknown>,
): ev is PraxMessageEvent<PenumbraRequestFailure> =>
  isPraxMessageEvent(ev) &&
  typeof unwrapPraxMessageEvent(ev) === 'string' &&
  unwrapPraxMessageEvent<string>(ev) in PenumbraRequestFailure;
