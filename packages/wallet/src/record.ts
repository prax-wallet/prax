export interface BoxJson {
  nonce: string;
  cipherText: string;
}

export interface KeyJson {
  _inner: JsonWebKey;
}

export interface KeyPrintJson {
  hash: string;
  salt: string;
}

export interface WalletJson {
  id: string;
  label: string;
  fullViewingKey: string;
  custody: { encryptedSeedPhrase: BoxJson };
}
