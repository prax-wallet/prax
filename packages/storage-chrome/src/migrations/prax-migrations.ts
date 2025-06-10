import type { AnotherVersion, HistoricVersion } from '../versions/numbers.js';
import type { PraxStorage } from '../versions/prax-storage.js';

export default {
  0: (old: PraxStorage<0>): Promise<PraxStorage<1>> =>
    import('./v0-v1.js').then(({ local }) => ({
      local: local(old.local),
      sync: undefined as never,
      session: undefined as never,
    })),
} as const satisfies {
  [K in HistoricVersion]: (
    old: Readonly<PraxStorage<K>>,
  ) => Promise<PraxStorage<AnotherVersion<K>>>;
};
