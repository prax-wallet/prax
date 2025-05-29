//  the `data` payload of `PraxMessageEvent<T>` is `{ [PRAX]: T }`
const isPraxMessageEventData = (
  data?: unknown,
): data is Record<typeof PRAX, NonNullable<unknown>> =>
  data != null &&
  typeof data === 'object' &&
  Object.keys(data).every(
    (key, index, allKeys) => key === PRAX && index === 0 && allKeys.length === 1,
  ) &&
  (data as Record<typeof PRAX, unknown>)[PRAX] != null;

export type PraxMessageEvent<T = unknown> = MessageEvent<Record<typeof PRAX, NonNullable<T>>>;

export const isPraxMessageEvent = (ev?: unknown): ev is PraxMessageEvent =>
  ev instanceof MessageEvent && isPraxMessageEventData(ev.data);

export const unwrapPraxMessageEvent = <T>(ev: PraxMessageEvent<T>): T => {
  if (!isPraxMessageEventData(ev.data)) {
    throw new TypeError('Not a valid PraxMessageEvent', { cause: ev });
  }
  // nullish values excluded by guard
  return ev.data[PRAX]!;
};
