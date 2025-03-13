import { createPromiseClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { AppService } from '@penumbra-zone/protobuf';
import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { WalletServices } from '@penumbra-zone/types/services';
import { Services } from '@repo/context';
import { localExtStorage } from './storage/local';
import { onboardGrpcEndpoint, onboardWallet } from './storage/onboard';
import { attachServiceControlListener } from './service-control';

export const startWalletServices = async () => {
  const wallet = await onboardWallet();
  const grpcEndpoint = await onboardGrpcEndpoint();
  const numeraires = await localExtStorage.get('numeraires');
  const chainId = await getChainId(grpcEndpoint);
  const walletCreationBlockHeight = await localExtStorage.get('walletCreationBlockHeight');

  const services = new Services({
    grpcEndpoint,
    chainId,
    walletId: WalletId.fromJsonString(wallet.id),
    fullViewingKey: FullViewingKey.fromJsonString(wallet.fullViewingKey),
    numeraires: numeraires.map(n => AssetId.fromJsonString(n)),
    walletCreationBlockHeight,
  });

  const { blockProcessor, indexedDb } = await services.getWalletServices();
  void syncLastBlockToStorage({ indexedDb });
  attachServiceControlListener(blockProcessor, indexedDb);

  return services;
};

/**
 * Get chainId from the rpc endpoint, or fall back to chainId from storage.
 *
 * It's possible that the remote endpoint may suddenly serve a new chainId.
 * @see https://github.com/prax-wallet/prax/pull/65
 */
const getChainId = async (baseUrl: string) => {
  const serviceClient = createPromiseClient(AppService, createGrpcWebTransport({ baseUrl }));
  const params =
    (await serviceClient
      .appParameters({})
      .then(response => response.appParameters)
      .catch(() => undefined)) ??
    (await localExtStorage
      .get('params')
      .then(json => (json ? AppParameters.fromJsonString(json) : undefined))
      .catch(() => undefined));

  if (params?.chainId) {
    void localExtStorage.set('params', params.toJsonString());
  } else {
    throw new Error('No chainId available');
  }

  return params.chainId;
};

/**
 * Sync the last block known by indexedDb with `chrome.storage.local`

 * Later used in Zustand store
 */
const syncLastBlockToStorage = async ({ indexedDb }: Pick<WalletServices, 'indexedDb'>) => {
  const fullSyncHeightDb = await indexedDb.getFullSyncHeight();
  await localExtStorage.set('fullSyncHeight', Number(fullSyncHeightDb));

  const subscription = indexedDb.subscribe('FULL_SYNC_HEIGHT');
  for await (const update of subscription) {
    await localExtStorage.set('fullSyncHeight', Number(update.value));
  }
};
