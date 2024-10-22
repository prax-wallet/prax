import { Listener } from './base';
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
      const rpcEndpoint = changes['grpcEndpoint']?.newValue as
        | LocalStorageState['grpcEndpoint']
        | undefined;
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
      const wallets = changes['wallets']?.newValue as LocalStorageState['wallets'] | undefined;
      const initialWallet = wallets?.[0];
      if (initialWallet) {
        resolve(initialWallet);
        localExtStorage.removeListener(storageListener);
      }
    };
    localExtStorage.addListener(storageListener);
  });
};

// For beta testing: set the wallet block height to zero for non-mainnet chain IDs.
// This logic only runs after the user selects their rpc endpoint.
export const handleWalletBlockHeight = async (grpcEndpoint: string) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (!grpcEndpoint.includes('penumbra-1')) {
    await localExtStorage.set('walletCreationBlockHeight', 0);
  }
};
