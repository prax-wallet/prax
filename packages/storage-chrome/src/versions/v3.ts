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
    /** Stringified FullViewingKey */
    fullViewingKey: string;
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
  params?: string;
  /** KeyPrintJson */
  passwordKeyPrint?: { hash: string; salt: string };
  /** integer */
  walletCreationBlockHeight?: number;
};
