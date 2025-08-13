export { type LOCAL, type SYNC, type VERSION };

type VERSION = 3;

type SYNC = void;

type LOCAL = {
  // required values
  knownSites: { choice: 'Approved' | 'Denied' | 'Ignored'; date: number; origin: string }[];
  /** Stringified AssetId */
  numeraires: string[];
  wallets: {
    custody:
      | { encryptedSeedPhrase: { cipherText: string; nonce: string } }
      | { encryptedSpendKey: { cipherText: string; nonce: string } }
      | { ledgerUsb: { cipherText: string; nonce: string } };
    fullViewingKey: import('../json-message').JsonMessage<
      import('@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb').FullViewingKey
    >;
    label: string;
  }[];

  // optional values
  backupReminderSeen?: boolean;
  /** integer */
  compactFrontierBlockHeight?: number;
  /** url string */
  frontendUrl?: string;
  /** integer */
  fullSyncHeight?: number;
  /** url string */
  grpcEndpoint?: string;
  /** Stringified AppParameters */
  params?: import('../json-message').JsonMessage<
    import('@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb').AppParameters
  >;
  /** KeyPrintJson */
  passwordKeyPrint?: { hash: string; salt: string };
  /** integer */
  walletCreationBlockHeight?: number;
};
