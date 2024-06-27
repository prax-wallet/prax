import { PenumbraRequestFailure } from '@penumbra-zone/client';
import { PraxConnection } from '../message/prax';

// @ts-expect-error - ts can't understand the injected string
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PraxMessage<T = unknown> = { [PRAX]: T };
export type PraxMessageEvent<T = unknown> = MessageEvent<PraxMessage<T>>;

export const isPraxMessageEvent = (ev: MessageEvent<unknown>): ev is PraxMessageEvent =>
  typeof ev.data === 'object' && ev.data !== null && PRAX in ev.data;

export const isPraxPortMessageEvent = (
  ev: MessageEvent<unknown>,
): ev is PraxMessageEvent<MessagePort> =>
  // @ts-expect-error - ts can't understand the injected string
  isPraxMessageEvent(ev) && ev.data[PRAX] instanceof MessagePort;

export const isPraxRequestMessageEvent = (
  ev: MessageEvent<unknown>,
): ev is PraxMessageEvent<PraxConnection.Request> =>
  // @ts-expect-error - ts can't understand the injected string
  isPraxMessageEvent(ev) && ev.data[PRAX] === PraxConnection.Request;

export const isPraxEndMessageEvent = (
  ev: MessageEvent<unknown>,
): ev is PraxMessageEvent<PraxConnection.Disconnect> =>
  // @ts-expect-error - ts can't understand the injected string
  isPraxMessageEvent(ev) && ev.data[PRAX] === PraxConnection.Disconnect;

export const isPraxFailureMessageEvent = (
  ev: MessageEvent<unknown>,
): ev is PraxMessageEvent<PenumbraRequestFailure> => {
  if (!isPraxMessageEvent(ev)) return false;
  // @ts-expect-error - ts can't understand the injected string
  const status = ev.data[PRAX] as unknown;
  return typeof status === 'string' && status in PenumbraRequestFailure;
};

export const unwrapPraxMessageEvent = <T>(ev: PraxMessageEvent<T>): T =>
  // @ts-expect-error - ts can't understand the injected string
  ev.data[PRAX] as T;
