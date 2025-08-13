import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { AppService } from '@penumbra-zone/protobuf';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { createClient } from '@connectrpc/connect';
import { Wallet } from '@repo/wallet';
import { localExtStorage } from '@repo/storage-chrome/local';
import { onboardGrpcEndpoint, onboardWallet } from '@repo/storage-chrome/onboard';
import { Services } from '@repo/context';
import { WalletServices } from '@penumbra-zone/types/services';
import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { SENTINEL_U64_MAX } from './utils/sentinel';

export const startWalletServices = async () => {
  const wallet = Wallet.fromJson(await onboardWallet());
  const grpcEndpoint = await onboardGrpcEndpoint();
  const numeraires = await localExtStorage.get('numeraires');
  const chainId = await getChainId(grpcEndpoint);
  const walletCreationBlockHeight = await localExtStorage.get('walletCreationBlockHeight');
  const compactFrontierBlockHeight = await localExtStorage.get('compactFrontierBlockHeight');

  const services = new Services({
    grpcEndpoint,
    chainId,
    walletId: wallet.id,
    fullViewingKey: wallet.fullViewingKey,
    numeraires: numeraires.map(n => AssetId.fromJsonString(n)),
    walletCreationBlockHeight,
    compactFrontierBlockHeight,
  });

  void syncLastBlockToStorage(await services.getWalletServices());

  return services;
};

/**
 * Get chainId from the rpc endpoint, or fall back to chainId from storage.
 *
 * It's possible that the remote endpoint may suddenly serve a new chainId.
 * @see https://github.com/prax-wallet/prax/pull/65
 */
const getChainId = async (baseUrl: string) => {
  const serviceClient = createClient(AppService, createGrpcWebTransport({ baseUrl }));
  const params =
    (await serviceClient.appParameters({}).then(
      ({ appParameters }) => appParameters,
      () => undefined,
    )) ??
    (await localExtStorage
      .get('params')
      .then(jsonParams => (jsonParams ? AppParameters.fromJsonString(jsonParams) : undefined)));

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
  const dbHeight = await indexedDb.getFullSyncHeight();

  if (dbHeight != null && dbHeight !== SENTINEL_U64_MAX) {
    await localExtStorage.set('fullSyncHeight', Number(dbHeight));
  }

  const sub = indexedDb.subscribe('FULL_SYNC_HEIGHT');
  for await (const { value } of sub) {
    if (value !== SENTINEL_U64_MAX) {
      await localExtStorage.set('fullSyncHeight', Number(value));
    }
  }
};
