import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { WalletJson } from '@penumbra-zone/types/wallet';
import { ChromeStorageArea, ChromeStorageListener } from '../util/chrome-storage-area';
import { PraxStorage } from '../versions/prax-storage';

/**
 * When a user first onboards with the extension, they won't have chosen a gRPC
 * endpoint yet. So we'll wait until they've chosen one to start trying to make
 * requests against it.
 */
export const onboardGrpcEndpoint = async ({
  local,
}: {
  local: ChromeStorageArea<PraxStorage<1>['local']>;
}): Promise<string> => {
  const { grpcEndpoint } = await local.get('grpcEndpoint');
  if (grpcEndpoint) {
    return grpcEndpoint;
  }

  return new Promise(resolve => {
    const storageListener: ChromeStorageListener<PraxStorage<1>['local']> = changes => {
      const rpcEndpoint = changes.grpcEndpoint?.newValue;
      if (rpcEndpoint) {
        resolve(rpcEndpoint);
        local.onChanged.removeListener(storageListener);
      }
    };
    local.onChanged.addListener(storageListener);
  });
};

export const onboardWallet = async ({
  local,
}: {
  local: ChromeStorageArea<PraxStorage<1>['local']>;
}): Promise<WalletJson> => {
  const { wallets } = await local.get('wallets');
  if (wallets[0]) {
    return wallets[0];
  }

  return new Promise(resolve => {
    const storageListener: ChromeStorageListener<PraxStorage<1>['local']> = changes => {
      const wallets = changes.wallets?.newValue;
      const initialWallet = wallets?.[0];
      if (initialWallet) {
        resolve(initialWallet);
        local.onChanged.removeListener(storageListener);
      }
    };
    local.onChanged.addListener(storageListener);
  });
};

export const isOnboarded = async ({
  local,
}: {
  local: ChromeStorageArea<PraxStorage<1>['local']>;
}): Promise<boolean> =>
  Promise.all([local.get('wallets'), local.get('grpcEndpoint'), local.get('frontendUrl')]).then(
    ([{ wallets }, { grpcEndpoint }, { frontendUrl }]) =>
      !!wallets.length && !!grpcEndpoint && !!frontendUrl,
  );

export const setOnboard = async (
  { local }: { local: ChromeStorageArea<PraxStorage<1>['local']> },
  {
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
  },
) => {
  await local.set({ frontendUrl: frontend });

  await local.set({ grpcEndpoint: rpc });

  // Flag associated with a dismissible popup that reminds the user to save their seed phrase
  await local.set({ backupReminderSeen: backupReminderSeen ?? true });

  // Block processor identifier for denoting whether the wallet is freshly generated.
  await local.set({ walletCreationBlockHeight });

  // Wallet services identifier for denoting whether the wallet is freshly generated
  // and should fetch the frontier snapshot.
  await local.set({
    compactFrontierBlockHeight: compactFrontierBlockHeight ?? walletCreationBlockHeight,
  });

  await local.set({ numeraires: numeraires.map(n => n.toJsonString()) });
};
