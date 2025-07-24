export type CustodyTypeName = (typeof custodyTypeNames)[number];

export function isCustodyTypeName(checkName?: string): checkName is CustodyTypeName {
  return custodyTypeNames.includes(checkName as CustodyTypeName);
}

export function assertCustodyTypeName(checkName?: string): asserts checkName is CustodyTypeName {
  if (!custodyTypeNames.includes(checkName as CustodyTypeName)) {
    throw new TypeError(`Unknown custody type name: ${checkName}`, { cause: checkName });
  }
}

export function getCustodyTypeName<T extends string>(custodyData: Record<T, unknown>) {
  const [custodyType, ...extra] = Object.keys(custodyData) as [T, ...string[]];

  if (extra.length > 0) {
    throw new TypeError(`Custody data has too many fields`, { cause: custodyData });
  }

  assertCustodyTypeName(custodyType);

  return custodyType as Extract<T, CustodyTypeName>;
}

const custodyTypeNames = ['encryptedSeedPhrase', 'encryptedSpendKey'] as const;
