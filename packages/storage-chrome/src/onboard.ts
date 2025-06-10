import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { WalletJson } from '@penumbra-zone/types/wallet';
import { Listener } from './util/migrated-storage-area';
import { localExtStorage } from './defaults';
import { LocalStorageState } from './versions/v1';

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

export const isOnboarded = (): Promise<boolean> =>
  Promise.all([
    localExtStorage.get('wallets'),
    localExtStorage.get('grpcEndpoint'),
    localExtStorage.get('frontendUrl'),
  ]).then(
    ([wallets, grpcEndpoint, frontendUrl]) =>
      !!wallets.length && grpcEndpoint != null && frontendUrl != null,
  );

export const setOnboard = async ({
  numeraires,
  walletCreationBlockHeight,
  backupReminderSeen,
  compactFrontierBlockHeight,
  rpc,
  frontend,
}: {
  numeraires: AssetId[];
  walletCreationBlockHeight?: number;
  compactFrontierBlockHeight?: number;
  backupReminderSeen?: boolean;
  rpc: string;
  frontend: string;
}) => {
  await localExtStorage.set('frontendUrl', frontend);

  await localExtStorage.set('grpcEndpoint', rpc);

  // Flag associated with a dismissible popup that reminds the user to save their seed phrase
  await localExtStorage.set('backupReminderSeen', backupReminderSeen ?? true);

  // Block processor identifier for denoting whether the wallet is freshly generated.
  await localExtStorage.set('walletCreationBlockHeight', walletCreationBlockHeight);

  // Wallet services identifier for denoting whether the wallet is freshly generated
  // and should fetch the frontier snapshot.
  await localExtStorage.set(
    'compactFrontierBlockHeight',
    compactFrontierBlockHeight ?? walletCreationBlockHeight,
  );

  await localExtStorage.set(
    'numeraires',
    numeraires.map(n => n.toJsonString()),
  );
};
