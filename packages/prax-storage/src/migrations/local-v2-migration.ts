import { V1LocalStorageState } from './local-v1';
import { MigrationFn } from '../base';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { V2LocalStorageState } from './local-v2';
import { bech32mWalletId } from '@penumbra-zone/bech32m/penumbrawalletid';
import { bech32mFullViewingKey } from '@penumbra-zone/bech32m/penumbrafullviewingkey';

export const localV1Migration: MigrationFn<V1LocalStorageState, V2LocalStorageState> = ({
  wallets: v1Wallets,
  walletCreationBlockHeight: v1WalletCreationBlockHeight,
  ...v1
}) => ({
  ...v1,
  wallets: migrateWallets(v1Wallets, v1WalletCreationBlockHeight),
  dbVersion: 2,
});

const migrateWallets = (
  wallets: V1LocalStorageState['wallets'],
  creationHeight?: number,
): V2LocalStorageState['wallets'] =>
  wallets.map((w, walletIndex) => ({
    type: 'SeedPhrase',
    encryptedSeedPhrase: w.custody.encryptedSeedPhrase,
    id: bech32mWalletId(WalletId.fromJsonString(w.id)),
    fullViewingKey: bech32mFullViewingKey(FullViewingKey.fromJsonString(w.fullViewingKey)),
    label: w.label,
    // assume that `creationHeight` applies to the default wallet
    creationHeight: walletIndex === 0 ? creationHeight : undefined,
  }));
