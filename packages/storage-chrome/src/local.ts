import { ExtensionStorage } from './base';
import LocalStorage_V1 from './versions/local-v1';
import localV0Migration from './migrations/local-v0-v1-migration';

export type LocalStorageState = LocalStorage_V1;

// Meant to be used for long-term persisted data. It is cleared when the extension is removed.
export const localExtStorage = new ExtensionStorage<LocalStorageState>(
  chrome.storage.local,
  { wallets: [], knownSites: [], numeraires: [] },
  { current: 1, migrations: { 0: localV0Migration } },
);
