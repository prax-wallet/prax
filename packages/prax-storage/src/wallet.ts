import { Box, BoxJson } from './box';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';

export interface WalletCreate {
  label: string;
  fullViewingKey: string;
  type: 'SeedPhrase';
  seedPhrase?: string[];
}

// Stored in chrome.local.storage
export interface WalletJson {
  label: string;
  id: Stringified<WalletId>;
  fullViewingKey: Stringified<FullViewingKey>;
  type: 'SeedPhrase';
  encryptedSeedPhrase?: BoxJson;
}

// Stored in zustand memory
export class Wallet {
  constructor(
    readonly label: string,
    readonly id: Stringified<WalletId>,
    readonly fullViewingKey: Stringified<FullViewingKey>,
    readonly type: 'SeedPhrase',
    readonly encryptedSeedPhrase?: Box,
  ) {}

  static fromJson(obj: WalletJson): Wallet {
    return new Wallet(
      obj.label,
      obj.id,
      obj.fullViewingKey,
      obj.type,
      obj.encryptedSeedPhrase ? Box.fromJson(obj.encryptedSeedPhrase) : undefined,
    );
  }

  toJson(): WalletJson {
    return {
      label: this.label,
      id: this.id,
      fullViewingKey: this.fullViewingKey,
      type: this.type,
      encryptedSeedPhrase: this.encryptedSeedPhrase?.toJson(),
    };
  }
}
