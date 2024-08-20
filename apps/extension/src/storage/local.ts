import { ExtensionStorage } from './base';
import { LocalStorageState, LocalStorageVersion } from './types';
import { localV1Migrations } from './migrations/local-v1-migrations';
import { localV2Migrations } from './migrations/local-v2-migrations';

export const localDefaults: Required<LocalStorageState> = {
  wallets: [],
  fullSyncHeight: undefined,
  grpcEndpoint: undefined,
  knownSites: [],
  params: undefined,
  passwordKeyPrint: undefined,
  frontendUrl: undefined,
  numeraires: [],
};

const migrationSteps: Record<LocalStorageVersion, LocalStorageVersion | undefined> = {
  [LocalStorageVersion.V1]: LocalStorageVersion.V2,
  [LocalStorageVersion.V2]: LocalStorageVersion.V3,
  [LocalStorageVersion.V3]: undefined,
};

const localMigrations = {
  [LocalStorageVersion.V1]: localV1Migrations,
  [LocalStorageVersion.V2]: localV2Migrations,
};

// Meant to be used for long-term persisted data. It is cleared when the extension is removed.
export const localExtStorage = new ExtensionStorage<LocalStorageState>(
  chrome.storage.local,
  localDefaults,
  LocalStorageVersion.V3,
  localMigrations,
  migrationSteps,
);
