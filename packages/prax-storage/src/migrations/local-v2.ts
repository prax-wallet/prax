import { ExtensionStorageDefaults } from '../base';

export interface V2LocalStorageState {
  dbVersion: number;
  frontendUrl: string | undefined;
  fullSyncHeight: number | undefined;
  grpcEndpoint: string | undefined;
  knownSites: {
    origin: string;
    choice: 'Approved' | 'Denied' | 'Ignored';
    date: number;
  }[];
  numeraires: Stringified<'AssetId'>[];
  params: Stringified<'AppParameters'> | undefined;
  passwordKeyPrint: { hash: string; salt: string } | undefined;
  wallets: {
    label: string;
    id: `penumbrawalletid1${string}`;
    type: 'Ledger' | 'SeedPhrase';
    fullViewingKey: `penumbrafullviewingkey1${string}`;
    encryptedSeedPhrase: null | { nonce: string; cipherText: string };
    creationHeight?: number;
  }[];
}

export const V2LocalDefaults: ExtensionStorageDefaults<V2LocalStorageState> = {
  frontendUrl: undefined,
  fullSyncHeight: undefined,
  grpcEndpoint: undefined,
  knownSites: [],
  numeraires: [],
  params: undefined,
  passwordKeyPrint: undefined,
  wallets: [],
};
