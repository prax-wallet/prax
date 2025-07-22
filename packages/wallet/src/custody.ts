export const getCustodyType = <T extends string>(custodyData: Record<T, unknown>): T => {
  const [custodyType, ...extra] = Object.keys(custodyData) as [T, ...string[]];

  if (extra.length > 0) {
    throw new TypeError(`Custody data has too many fields`, { cause: custodyData });
  }

  return custodyType;
};
