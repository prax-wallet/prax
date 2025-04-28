import type { V2LocalStorageState as LocalStorageState } from './migrations/local-v2';

export type { LocalStorageState };
export type OriginRecord = LocalStorageState['knownSites'][number];
// export type UserChoice = LocalStorageState['knownSites'][number]['choice'];
export type WalletRecord = LocalStorageState['wallets'][number];
