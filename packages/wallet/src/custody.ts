const CUSTODY_TYPES = ['encryptedSeedPhrase', 'encryptedSpendKey'] as const;

export type CustodyTypeName = (typeof CUSTODY_TYPES)[number];

export function isCustodyTypeName(checkName?: string): checkName is CustodyTypeName {
  return checkName != null && (CUSTODY_TYPES as readonly string[]).includes(checkName);
}

export function assertCustodyTypeName(checkName?: string): asserts checkName is CustodyTypeName {
  if (!isCustodyTypeName(checkName)) {
    throw new TypeError(`Unknown custody type name: ${checkName}`, { cause: checkName });
  }
}

export function getCustodyTypeName<T extends string>(custodyData: Record<T, unknown>) {
  const [custodyType, ...extra] = Object.keys(custodyData) as T[];

  if (extra.length) {
    throw new TypeError(`Custody data has too many fields`, { cause: custodyData });
  }

  assertCustodyTypeName(custodyType);

  return custodyType;
}
