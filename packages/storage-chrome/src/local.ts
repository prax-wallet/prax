import { ExtensionStorage, ExtensionStorageDefaults } from './base';
import { VERSION as LocalStorageVersion, LOCAL as LocalStorageState } from './versions/v1';

const localDefaults: ExtensionStorageDefaults<LocalStorageState> = {
  wallets: [],
  knownSites: [],
  numeraires: [],
};

export const localExtStorage = new ExtensionStorage<LocalStorageState, LocalStorageVersion>(
  chrome.storage.local,
  localDefaults,
  1,
);

export type { LocalStorageState, LocalStorageVersion };
export type LocalStorage = ExtensionStorage<LocalStorageState, LocalStorageVersion>;
