export const SENTINEL_U64_MAX = BigInt('0xffffffffffffffff');

export const isSentinel = (h: bigint | number | undefined) =>
  h === SENTINEL_U64_MAX || h === Number(SENTINEL_U64_MAX);
