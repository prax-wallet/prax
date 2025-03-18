import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { AppService } from '@penumbra-zone/protobuf';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { createPromiseClient } from '@connectrpc/connect';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { localExtStorage } from './storage/local';
import { onboardGrpcEndpoint, onboardWallet } from './storage/onboard';
import { Services } from '@repo/context';
import { WalletServices } from '@penumbra-zone/types/services';
import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { BlockProcessorRequest } from './message/internal-control/block-processor';

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
  const serviceClient = createPromiseClient(AppService, createGrpcWebTransport({ baseUrl }));
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

export const controlWalletServices = async (
  { blockProcessor, indexedDb }: Pick<WalletServices, 'blockProcessor' | 'indexedDb'>,
  command: BlockProcessorRequest,
) => {
  switch (command) {
    case BlockProcessorRequest.ClearCache:
      {
        blockProcessor.stop('clearCache');
        await Promise.allSettled([
          localExtStorage.remove('params'),
          indexedDb.clear(),
          localExtStorage.remove('fullSyncHeight'),
        ]);
        // Schedule reload after response is sent
        setTimeout(() => chrome.runtime.reload(), 0);
      }
      break;
    case BlockProcessorRequest.ChangeNumeraires:
      {
        const newNumeraires = await localExtStorage.get('numeraires');
        blockProcessor.setNumeraires(newNumeraires.map(n => AssetId.fromJsonString(n)));
        /**
         * Changing numeraires causes all BSOD-based prices to be removed.
         * This means that some new blocks will need to be scanned to get prices for the new numeraires.
         * It also means that immediately after changing numeraires user will not see any equivalent BSOD-based prices.
         */
        await indexedDb.clearSwapBasedPrices();
      }
      break;
    default:
      throw new Error('Unknown BlockProcessor command', { cause: command });
  }
};
