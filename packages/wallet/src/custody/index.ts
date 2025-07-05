import impls, { type CustodyImpl, type CustodyImplName } from './impls';

export function assertCustodyImplName<T extends string>(
  checkName: T,
): asserts checkName is Extract<T, CustodyImplName> {
  switch (checkName as CustodyImplName) {
    case 'encryptedSeedPhrase':
    case 'encryptedSpendKey':
      return;
    default:
      throw new TypeError(`Unknown custody type ${String(checkName)}`);
  }
}

export function getCustodyImplName<T extends string, J = unknown>(
  custodyObject?: Record<T, J>,
): Extract<T, CustodyImplName> {
  const [custodyType, ...extra] = Object.keys(custodyObject ?? {}) as T[];

  if (custodyType == null) {
    throw new RangeError('No custody fields', { cause: custodyObject });
  } else if (extra.length) {
    throw new RangeError(`Additional custody fields ${extra.join()}`, { cause: custodyObject });
  }

  assertCustodyImplName(custodyType);
  return custodyType;
}

export function getCustodyImplByName<T extends string>(
  custodyType: T,
): CustodyImpl[Extract<T, CustodyImplName>] {
  assertCustodyImplName(custodyType);
  const impl = impls[custodyType];
  return impl;
}
