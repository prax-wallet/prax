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
  numeraires: string[]; // Stringified<'AssetId'>[];
  params: string | undefined; // Stringified<'AppParameters'>
  passwordKeyPrint: { hash: string; salt: string } | undefined;
  wallets: {
    label: string;
    id: string; // Stringified<'WalletId'>;
    // type: 'Ledger' | 'SeedPhrase';
    type: string;
    fullViewingKey: string; // Stringified<'FullViewingKey'>;
    encryptedSeedPhrase: null | { nonce: string; cipherText: string };
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
