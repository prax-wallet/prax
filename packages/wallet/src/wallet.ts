import { Box, type BoxJson } from '@repo/encryption/box';

export interface WalletJson {
  id: string;
  label: string;
  fullViewingKey: string;
  custody: { encryptedSeedPhrase: BoxJson };
}

export class Wallet {
  constructor(
    readonly label: string,
    readonly id: string,
    readonly fullViewingKey: string,
    readonly custody: { encryptedSeedPhrase: Box },
  ) {}

  static fromJson(obj: WalletJson): Wallet {
    return new Wallet(obj.label, obj.id, obj.fullViewingKey, {
      encryptedSeedPhrase: Box.fromJson(obj.custody.encryptedSeedPhrase),
    });
  }

  toJson(): WalletJson {
    return {
      label: this.label,
      id: this.id,
      fullViewingKey: this.fullViewingKey,
      custody: {
        encryptedSeedPhrase: this.custody.encryptedSeedPhrase.toJson(),
      },
    };
  }
}
