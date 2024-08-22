import { ExtensionStorage, ExtensionStorageDefaults } from './base';
import { KeyJson } from '@penumbra-zone/crypto-web/encryption';
import { sessionV0Migration } from './migrations/session-v1-migration';

// If one adds an optional field (newField: string | undefined), a migration is not necessary.
// If one adds a new required field (newField: string[]), a migration is necessary
// to have the default value in the database.
export interface SessionStorageState {
  dbVersion: number;
  passwordKey: KeyJson | undefined;
}

export const sessionDefaults: ExtensionStorageDefaults<SessionStorageState> = {
  passwordKey: undefined,
};

// Meant to be used for short-term persisted data. Holds data in memory for the duration of a browser session.
export const sessionExtStorage = new ExtensionStorage<SessionStorageState>({
  storage: chrome.storage.session,
  defaults: sessionDefaults,
  version: {
    current: 1,
    migrations: {
      0: sessionV0Migration,
    },
  },
});
