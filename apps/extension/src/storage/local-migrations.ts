import { fullViewingKeyFromBech32m } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { walletIdFromBech32m } from '@penumbra-zone/bech32m/penumbrawalletid';
import { LocalStorageState, LocalStorageVersion } from './types';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';

interface LocalMigration {
  wallets: {
    [LocalStorageVersion.V1]: (old: LocalStorageState['wallets']) => LocalStorageState['wallets'];
  };
  grpcEndpoint: {
    [LocalStorageVersion.V1]: (
      old: LocalStorageState['grpcEndpoint'],
    ) => LocalStorageState['grpcEndpoint'];
    [LocalStorageVersion.V2]: (
      old: LocalStorageState['grpcEndpoint'],
    ) => LocalStorageState['grpcEndpoint'];
  };
  frontendUrl: {
    [LocalStorageVersion.V1]: (
      old: LocalStorageState['frontendUrl'],
    ) => LocalStorageState['frontendUrl'];
    [LocalStorageVersion.V2]: (
      old: LocalStorageState['frontendUrl'],
    ) => LocalStorageState['frontendUrl'];
  };
}

export const localMigrations: LocalMigration = {
  wallets: {
    [LocalStorageVersion.V1]: old =>
      old.map(({ fullViewingKey, id, label, custody }) => {
        const fvk = new FullViewingKey(fullViewingKeyFromBech32m(fullViewingKey));
        const walletId = new WalletId(walletIdFromBech32m(id));
        return {
          fullViewingKey: fvk.toJsonString(),
          id: walletId.toJsonString(),
          label,
          custody,
        };
      }),
  },
  grpcEndpoint: {
    [LocalStorageVersion.V1]: old => {
      return '';
    },
    [LocalStorageVersion.V2]: old => {
      return '';
    },
  },
  frontendUrl: {
    [LocalStorageVersion.V1]: old => {
      return '';
    },
    [LocalStorageVersion.V2]: old => {
      return '';
    },
  },
};
