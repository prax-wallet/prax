import { LocalStorageState } from '@repo/storage-chrome/types';
import { UserChoice } from '@penumbra-zone/types/user-choice';

export const EXAMPLE_MINIFRONT_URL = 'https://app.example.com';

export const localTestDefaults: LocalStorageState = {
  dbVersion: 1,
  wallets: [],
  fullSyncHeight: undefined,
  knownSites: [{ origin: EXAMPLE_MINIFRONT_URL, choice: UserChoice.Approved, date: Date.now() }],
  params: undefined,
  grpcEndpoint: undefined,
  passwordKeyPrint: undefined,
  frontendUrl: EXAMPLE_MINIFRONT_URL,
  numeraires: [],
  walletCreationBlockHeight: 0,
  compactFrontierBlockHeight: 0,
  backupReminderSeen: undefined,
};
