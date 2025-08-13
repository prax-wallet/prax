import { ChainRegistryClient } from '@penumbra-labs/registry';

export const MAINNET = 'penumbra-1';
export const REGISTRY = new ChainRegistryClient().bundled.globals();

export function assertVersion<E extends number>(test: unknown, expect: E): asserts test is E {
  if (typeof expect !== 'number') {
    throw new TypeError(`Expected version ${String(expect as unknown)} is not a number`, {
      cause: expect,
    });
  }
  if (typeof test !== 'number') {
    throw new TypeError(`Input version ${String(test)} is not a number`, { cause: test });
  }
  if (test !== expect) {
    throw new RangeError(`Expected version ${expect} but received ${test} input`, { cause: test });
  }
}

export function isVersion<E extends number>(test: unknown, expect: E): test is E {
  try {
    assertVersion(test, expect);
    return true;
  } catch {
    return false;
  }
}

export function expectVersion<X, E extends number, O extends number>(
  test: X,
  expect: E,
  out: O,
): X extends E ? O : never {
  assertVersion(test, expect);
  return out as X extends E ? O : never;
}

export type { Migration } from './type';

export type { JsonMessage } from '../json-message';
