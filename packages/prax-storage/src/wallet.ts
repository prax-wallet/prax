import { Box } from './box';

export interface WalletCreate {
  label: string;
  fullViewingKey: string;
  type: 'SeedPhrase';
  seedPhrase?: string[];
}

// Stored in chrome.local.storage
export interface WalletJson {
  label: string;
  id: string; // Stringified<'WalletId'>;
  type: string;
  fullViewingKey: string; // Stringified<'FullViewingKey'>;
  encryptedSeedPhrase: null | { nonce: string; cipherText: string };
}

// Stored in zustand memory
export class Wallet {
  constructor(
    readonly label: string,
    readonly id: string, // Stringified<WalletId>,
    readonly fullViewingKey: string, // Stringified<FullViewingKey>,
    readonly walletType: string,
    readonly encryptedSeedPhrase: Box | null,
  ) {
    if (walletType !== 'SeedPhrase' || !encryptedSeedPhrase) {
      throw new TypeError('Not a SeedPhrase wallet');
    }
  }

  static fromJson(obj: WalletJson): Wallet {
    return new Wallet(
      obj.label,
      obj.id,
      obj.fullViewingKey,
      obj.type,
      obj.encryptedSeedPhrase ? Box.fromJson(obj.encryptedSeedPhrase) : null,
    );
  }

  toJson(): WalletJson {
    return {
      label: this.label,
      id: this.id,
      fullViewingKey: this.fullViewingKey,
      type: this.walletType,
      encryptedSeedPhrase: this.encryptedSeedPhrase?.toJson() ?? null,
    };
  }
}
