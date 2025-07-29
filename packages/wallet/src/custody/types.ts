const CUSTODY_TYPES = ['encryptedSeedPhrase', 'encryptedSpendKey', 'ledgerUsb'] as const;

export type CustodyTypeName = (typeof CUSTODY_TYPES)[number];

export type CustodyNamedValue<V, S extends CustodyTypeName = CustodyTypeName> = {
  [N in S]: Record<N, V>;
}[S];

export function isCustodyTypeName(checkName?: unknown): checkName is CustodyTypeName {
  return typeof checkName === 'string' && (CUSTODY_TYPES as readonly string[]).includes(checkName);
}

export function assertCustodyTypeName(checkName?: unknown): asserts checkName is CustodyTypeName {
  if (!isCustodyTypeName(checkName)) {
    throw new TypeError(`Custody type name unknown: ${String(checkName)}`);
  }
}

export function isCustodyNamedValue<V>(
  checkRecord?: Record<string, V>,
): checkRecord is CustodyNamedValue<V> {
  const [firstKey, ...extra] = Object.keys(checkRecord ?? {});
  return isCustodyTypeName(firstKey) && !extra.length;
}

export function assertCustodyNamedValue<V>(
  checkRecord?: Record<string, V>,
): asserts checkRecord is CustodyNamedValue<V> {
  const [firstKey, ...extra] = Object.keys(checkRecord ?? {});
  if (extra.length) {
    throw new TypeError('Custody data has too many fields', { cause: checkRecord });
  }
  assertCustodyTypeName(firstKey);
}

export function getCustodyTypeName<K extends CustodyTypeName>(
  custodyData: CustodyNamedValue<unknown, K>,
): K {
  assertCustodyNamedValue(custodyData);
  const [custodyKey] = Object.keys(custodyData) as [K];
  return custodyKey;
}
