import { MigrationFn } from '../base';
import { KeyJson } from '@penumbra-zone/crypto-web/encryption';
import { SessionStorageState } from '../session';

export enum V0SessionStorageVersion {
  V1 = 'V1',
}

interface StorageItem<T> {
  version: V0SessionStorageVersion;
  value: T;
}

// Note: previous session storage used to key a version on each individual field
export interface V0SessionStorageState {
  passwordKey: StorageItem<KeyJson | undefined>;
}

// Update SessionStorageState to V1SessionStorageState if there is a version bump
export const sessionV0Migration: MigrationFn<V0SessionStorageState, SessionStorageState> = v0 => {
  return {
    dbVersion: 1,
    passwordKey: v0.passwordKey.value,
  };
};
