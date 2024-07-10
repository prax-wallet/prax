import { Listener, StorageItem } from './base';
import { localExtStorage } from './local';
import { WalletJson } from '@penumbra-zone/types/wallet';
import { LocalStorageState } from './types';

/**
 * When a user first onboards with the extension, they won't have chosen a gRPC
 * endpoint yet. So we'll wait until they've chosen one to start trying to make
 * requests against it.
 */
export const onboardGrpcEndpoint = async (): Promise<string> => {
  const grpcEndpoint = await localExtStorage.get('grpcEndpoint');
  if (grpcEndpoint) {
    return grpcEndpoint;
  }

  return new Promise(resolve => {
    const storageListener = (changes: Record<string, { newValue?: unknown }>) => {
      const storageItem = changes['grpcEndpoint']?.newValue as
        | StorageItem<LocalStorageState['grpcEndpoint']>
        | undefined;
      const rpcEndpoint = storageItem?.value;
      if (rpcEndpoint) {
        resolve(rpcEndpoint);
        localExtStorage.removeListener(storageListener);
      }
    };
    localExtStorage.addListener(storageListener);
  });
};

export const onboardWallet = async (): Promise<WalletJson> => {
  const wallets = await localExtStorage.get('wallets');
  if (wallets[0]) {
    return wallets[0];
  }

  return new Promise(resolve => {
    const storageListener: Listener = changes => {
      const storageItem = changes['wallets']?.newValue as
        | StorageItem<LocalStorageState['wallets']>
        | undefined;
      const initialWallet = storageItem?.value[0];
      if (initialWallet) {
        resolve(initialWallet);
        localExtStorage.removeListener(storageListener);
      }
    };
    localExtStorage.addListener(storageListener);
  });
};
