export { type LOCAL, type SYNC, type VERSION };

type VERSION = 0;

type SYNC = void;

type LOCAL = {
  /** Legacy `WalletJson` with bech32m fields or `WalletJson` with stringified message fields */ wallets:
    | VersionedItem<
        {
          /** arbitrary */ label: string;
          /** bech32m */ id: `penumbrawalletid1${string}`;
          /** bech32m */ fullViewingKey: `penumbrafullviewingkey1${string}`;
          custody: { /** BoxJson */ encryptedSeedPhrase: { cipherText: string; nonce: string } };
        }[],
        'V1'
      >
    | VersionedItem<
        {
          /** arbitrary */ label: string;
          /** Stringified<WalletId> */ id: `{${string}}`;
          /** Stringified<FullViewingKey> */ fullViewingKey: `{${string}}`;
          custody: { /** BoxJson */ encryptedSeedPhrase: { cipherText: string; nonce: string } };
        }[],
        'V2'
      >;
  /** url */ grpcEndpoint?: VersionedItem<string>;
  /** url */ frontendUrl?: VersionedItem<string>;
  /** KeyPrintJson */ passwordKeyPrint?: VersionedItem<{ hash: string; salt: string }>;
  /** integer block height */ fullSyncHeight?: VersionedItem<number>;
  /** OriginRecord[] */ knownSites: VersionedItem<
    {
      choice: 'Approved' | 'Denied' | 'Ignored';
      /** epoch milliseconds */ date: number;
      /** url */ origin: string;
    }[]
  >;
  /** Stringified<AppParameters> */ params?: VersionedItem<string>;
  /** Stringified<AssetId>[] */ numeraires: VersionedItem<string[]>;
};

type VersionedItem<T, V extends 'V1' | 'V2' = 'V1' | 'V2'> = {
  version: V;
  value?: T;
};
