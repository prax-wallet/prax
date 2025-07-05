import { default as encryptedSeedPhrase } from './encrypted-seed-phrase';
import { default as encryptedSpendKey } from './encrypted-spend-key';
import type { CustodyConstructor } from './types';

const impls = { encryptedSeedPhrase, encryptedSpendKey } as const;

export default impls satisfies CustodyImpl;

export type CustodyImplName = keyof typeof impls;

export type CustodyImplJson = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- unused inference
  [K in CustodyImplName]: (typeof impls)[K] extends CustodyConstructor<K, infer J, infer _C>
    ? J
    : never;
};

export type CustodyImplParam = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- unused inference
  [K in CustodyImplName]: (typeof impls)[K] extends CustodyConstructor<K, infer _J, infer C>
    ? C
    : never;
};

export type CustodyImpl = {
  [K in CustodyImplName]: CustodyConstructor<K, CustodyImplJson[K], CustodyImplParam[K]>;
};
