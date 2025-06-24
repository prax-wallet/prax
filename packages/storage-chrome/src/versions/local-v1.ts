export default LocalStorage_V1;

type LocalStorage_V1 = {
  // required values
  knownSites: { choice: 'Approved' | 'Denied' | 'Ignored'; date: number; origin: string }[];
  /** Stringified AssetId */
  numeraires: string[];
  wallets: {
    custody: {
      /** BoxJson */
      encryptedSeedPhrase: { cipherText: string; nonce: string };
    };
    /** Stringified FullViewingKey */
    fullViewingKey: string;
    /** Stringified WalletId */
    id: string;
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
