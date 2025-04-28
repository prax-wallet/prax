import { ExtensionStorage } from './base';
import { localV0Migration } from './migrations/local-v1-migration';
import { V2LocalDefaults, V2LocalStorageState } from './migrations/local-v2';
import { localV1Migration } from './migrations/local-v2-migration';

// Meant to be used for long-term persisted data. It is cleared when the extension is removed.
export const localExtStorage = new ExtensionStorage<V2LocalStorageState>({
  storage: chrome.storage.local,
  defaults: V2LocalDefaults,
  version: {
    current: 2,
    migrations: {
      0: localV0Migration,
      1: localV1Migration,
    },
  },
});
