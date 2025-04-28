import { Listener } from './base';
import { localExtStorage } from './local';
import { LocalStorageState } from './types';

/**
 * When a user first onboards with the extension, they won't have chosen a gRPC
 * endpoint yet. So we'll wait until they've chosen one to start trying to make
 * requests against it.
 */
export const onboardGrpcEndpoint = async (): Promise<
  NonNullable<LocalStorageState['grpcEndpoint']>
> => {
  const grpcEndpoint = await localExtStorage.get('grpcEndpoint');
  if (grpcEndpoint?.length) {
    return grpcEndpoint;
  }

  return new Promise(resolve => {
    const storageListener: Listener = changes => {
      const grpcEndpoint = changes['grpcEndpoint']?.newValue as
        | LocalStorageState['grpcEndpoint']
        | undefined;
      if (grpcEndpoint?.length) {
        resolve(grpcEndpoint);
        localExtStorage.removeListener(storageListener);
      }
    };
    localExtStorage.addListener(storageListener);
  });
};

export const onboardWallets = async (): Promise<NonNullable<LocalStorageState['wallets']>> => {
  const wallets = await localExtStorage.get('wallets');
  if (wallets.length) {
    return wallets;
  }

  return new Promise(resolve => {
    const storageListener: Listener = changes => {
      const wallets = changes['wallets']?.newValue as LocalStorageState['wallets'] | undefined;
      if (wallets?.length) {
        resolve(wallets);
        localExtStorage.removeListener(storageListener);
      }
    };
    localExtStorage.addListener(storageListener);
  });
};
