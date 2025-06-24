export interface OriginRecord {
  origin: string;
  choice: 'Approved' | 'Denied' | 'Ignored';
  date: number;
}

export interface WalletRecord {
  id: string;
  label: string;
  fullViewingKey: string;
  custody: {
    encryptedSeedPhrase: {
      cipherText: string;
      nonce: string;
    };
  };
}
