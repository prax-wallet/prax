type LegacyVersionedItem<T, V extends 'V1' | 'V2' = 'V1' | 'V2'> = {
  version: V;
  value: T;
};

export type local = {
  frontendUrl?: LegacyVersionedItem<string | undefined>;
  fullSyncHeight?: LegacyVersionedItem<number | undefined>;
  grpcEndpoint?: LegacyVersionedItem<string | undefined>;
  knownSites?: LegacyVersionedItem<
    { origin: string; choice: 'Approved' | 'Denied' | 'Ignored'; date: number }[]
  >;
  /** AssetId JSON string array */
  numeraires?: LegacyVersionedItem<string[]>;
  /** AppParameters JSON string */
  params?: LegacyVersionedItem<string | undefined>;
  /** KeyPrintJson */
  passwordKeyPrint?: LegacyVersionedItem<{ hash: string; salt: string } | undefined>;
  wallets?:
    | LegacyVersionedItem<
        {
          label: string;
          custody: {
            /** BoxJson */
            encryptedSeedPhrase: { nonce: string; cipherText: string };
          };
          fullViewingKey: `penumbrafullviewingkey1${string}`;
          id: `penumbrawalletid1${string}`;
        }[],
        'V1'
      >
    | LegacyVersionedItem<
        {
          label: string;
          custody: {
            /** BoxJson */
            encryptedSeedPhrase: { nonce: string; cipherText: string };
          };
          /** FullViewingKey JSON string */
          fullViewingKey: string;
          /** WalletId JSON string */
          id: string;
        }[],
        'V2'
      >;
};

export type sync = never;
