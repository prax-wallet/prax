import { LocalStorageState } from '../storage/types';

export const EXAMPLE_MINIFRONT_URL = 'https://app.example.com';

export const localTestDefaults: LocalStorageState = {
  dbVersion: 2,
  wallets: [],
  fullSyncHeight: undefined,
  knownSites: [{ origin: EXAMPLE_MINIFRONT_URL, choice: 'Approved', date: Date.now() }],
  params: undefined,
  grpcEndpoint: undefined,
  passwordKeyPrint: undefined,
  frontendUrl: EXAMPLE_MINIFRONT_URL,
  numeraires: [],
};
