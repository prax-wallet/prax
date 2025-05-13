import { ExtensionStorage, ExtensionStorageDefaults } from './base';
import { LocalStorageState } from './types';
import { localV0Migration } from './migrations/local-v1-migration';

export const localDefaults: ExtensionStorageDefaults<LocalStorageState> = {
  wallets: [],
  fullSyncHeight: undefined,
  grpcEndpoint: undefined,
  knownSites: [],
  params: undefined,
  passwordKeyPrint: undefined,
  frontendUrl: undefined,
  numeraires: [],
  walletCreationBlockHeight: undefined,
  compactFrontierBlockHeight: undefined,
};

// Meant to be used for long-term persisted data. It is cleared when the extension is removed.
export const localExtStorage = new ExtensionStorage<LocalStorageState>({
  storage: chrome.storage.local,
  defaults: localDefaults,
  version: {
    current: 1,
    migrations: {
      0: localV0Migration,
    },
  },
});
