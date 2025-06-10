import type { StorageRecord } from './util/storage-record';
import { CURRENT_VERSION } from './versions/numbers';
import type { PraxStorage } from './versions/prax-storage';

export type StorageDefaults<T extends StorageRecord> = {
  [P in keyof Required<T>]: Pick<T, P> extends Required<Pick<T, P>> ? T[P] : undefined;
};

export const local: StorageDefaults<PraxStorage<typeof CURRENT_VERSION>['local']> = {
  wallets: [],
  knownSites: [],
  numeraires: [],
  grpcEndpoint: undefined,
  frontendUrl: undefined,
  passwordKeyPrint: undefined,
  fullSyncHeight: undefined,
  params: undefined,
  walletCreationBlockHeight: undefined,
  compactFrontierBlockHeight: undefined,
  backupReminderSeen: undefined,
};

export const sync: StorageDefaults<PraxStorage<typeof CURRENT_VERSION>['sync']> =
  undefined as never;

export const session: StorageDefaults<PraxStorage<typeof CURRENT_VERSION>['session']> = {
  passwordKey: undefined,
};
