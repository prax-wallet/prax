import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { AppService } from '@penumbra-zone/protobuf';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { createClient } from '@connectrpc/connect';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { localExtStorage } from './storage/local';
import { onboardGrpcEndpoint, onboardWallets } from './storage/onboard';
import { Services } from '@repo/context';
import { WalletServices } from '@penumbra-zone/types/services';
import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { deserializeWallet } from './wallet';
import { assetIdFromBech32m } from '@penumbra-zone/bech32m/passet';

export const startWalletServices = async () => {
  const wallets = await onboardWallets();
  const wallet = deserializeWallet(wallets[0]!);
  const grpcEndpoint = await onboardGrpcEndpoint();
  const numeraires = (await localExtStorage.get('numeraires')).map(n => assetIdFromBech32m(n));
  const chainId = await getChainId(grpcEndpoint);

  const services = new Services({
    grpcEndpoint,
    chainId,
    walletId: new WalletId(wallet.id),
    fullViewingKey: new FullViewingKey(wallet.fullViewingKey),
    numeraires: numeraires.map(n => new AssetId(n)),
    walletCreationBlockHeight: wallet.creationHeight,
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
  const fullSyncHeightDb = await indexedDb.getFullSyncHeight();
  await localExtStorage.set('fullSyncHeight', Number(fullSyncHeightDb));

  const subscription = indexedDb.subscribe('FULL_SYNC_HEIGHT');
  for await (const update of subscription) {
    await localExtStorage.set('fullSyncHeight', Number(update.value));
  }
};
