import { ChainRegistryClient } from '@penumbra-labs/registry';

export const MAINNET = 'penumbra-1';
export const REGISTRY = new ChainRegistryClient().bundled.globals();

export function assertVersion<E extends number>(from: unknown, expect?: E): asserts from is E {
  if (typeof expect !== 'number') {
    throw new TypeError(`Expected version ${expect} is not a number`, { cause: expect });
  }
  if (typeof from !== 'number') {
    throw new TypeError(`Input version ${String(from)} is not a number`, { cause: from });
  }
  if (from !== expect) {
    throw new RangeError(`Expected version ${expect} but received ${from} input`, { cause: from });
  }
}

export function isVersion<E extends number>(from: unknown, expect: E): from is E {
  try {
    assertVersion(from, expect);
    return true;
  } catch {
    return false;
  }
}

export function expectVersion<E extends number, F extends number, T extends number>(
  from: F,
  expect: E,
  to: T,
): F extends E ? T : never {
  assertVersion(from, expect);
  return to as F extends E ? T : never;
}

export type { Migration } from './types';
