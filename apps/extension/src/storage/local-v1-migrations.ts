import { fullViewingKeyFromBech32m } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { walletIdFromBech32m } from '@penumbra-zone/bech32m/penumbrawalletid';
import { LocalStorageState } from './types';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { MigrationMap } from './base';

export const localV1Migrations: MigrationMap<LocalStorageState, LocalStorageState> = {
  wallets: old => {
    return old.map(({ fullViewingKey, id, label, custody }) => {
      const fvk = new FullViewingKey(fullViewingKeyFromBech32m(fullViewingKey));
      const walletId = new WalletId(walletIdFromBech32m(id));
      return {
        fullViewingKey: fvk.toJsonString(),
        id: walletId.toJsonString(),
        label,
        custody,
      };
    });
  },
};
