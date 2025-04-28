import { PlainMessage } from '@bufbuild/protobuf';
import {
  bech32mFullViewingKey,
  fullViewingKeyFromBech32m,
} from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { bech32mWalletId, walletIdFromBech32m } from '@penumbra-zone/bech32m/penumbrawalletid';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { uint8ArrayToBase64, base64ToUint8Array } from '@penumbra-zone/types/base64';
import { LocalStorageState } from './storage/types';

export type WalletType = 'Ledger' | 'SeedPhrase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Wallet<T extends WalletType = any> {
  label: string;
  id: PlainMessage<WalletId>;
  fullViewingKey: PlainMessage<FullViewingKey>;
  creationHeight?: number;
  type: T;
  encryptedSeedPhrase: T extends 'SeedPhrase'
    ? { nonce: Uint8Array; cipherText: Uint8Array }
    : null;
}

export const serializeWallet = <T extends WalletType>(
  wallet: Wallet<T>,
): LocalStorageState['wallets'][number] => ({
  type: wallet.type,
  label: wallet.label,
  id: bech32mWalletId(wallet.id),
  creationHeight: wallet.creationHeight,
  fullViewingKey: bech32mFullViewingKey(wallet.fullViewingKey),
  encryptedSeedPhrase: wallet.encryptedSeedPhrase && {
    nonce: uint8ArrayToBase64(wallet.encryptedSeedPhrase.nonce),
    cipherText: uint8ArrayToBase64(wallet.encryptedSeedPhrase.cipherText),
  },
});

export const deserializeWallet = <T extends WalletType>(
  serialized: LocalStorageState['wallets'][number],
): Wallet<T> => ({
  type: serialized.type as T,
  label: serialized.label,
  id: walletIdFromBech32m(serialized.id),
  creationHeight: serialized.creationHeight,
  fullViewingKey: fullViewingKeyFromBech32m(serialized.fullViewingKey),
  encryptedSeedPhrase: (serialized.type === 'SeedPhrase'
    ? {
        nonce: base64ToUint8Array(serialized.encryptedSeedPhrase!.nonce),
        cipherText: base64ToUint8Array(serialized.encryptedSeedPhrase!.cipherText),
      }
    : null) as T extends 'SeedPhrase' ? { nonce: Uint8Array; cipherText: Uint8Array } : null,
});
