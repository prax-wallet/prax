import { AppParameters } from '@buf/penumbra-zone_penumbra.bufbuild_es/penumbra/core/app/v1/app_pb';
import { AppService } from '@penumbra-zone/protobuf';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { createPromiseClient } from '@connectrpc/connect';
import {
  FullViewingKey,
  WalletId,
} from '@buf/penumbra-zone_penumbra.bufbuild_es/penumbra/core/keys/v1/keys_pb';
import { localExtStorage } from './storage/local';
import { onboardGrpcEndpoint, onboardWallet } from './storage/onboard';
import { Services } from '@repo/context';
import { ServicesMessage } from './message/services';
import { WalletServices } from '@penumbra-zone/types/services';
import { AssetId } from '@buf/penumbra-zone_penumbra.bufbuild_es/penumbra/core/asset/v1/asset_pb';
import { isInternalSender } from './senders/internal';

export const startWalletServices = async () => {
  const wallet = await onboardWallet();
  const grpcEndpoint = await onboardGrpcEndpoint();
  const numeraires = await localExtStorage.get('numeraires');

  const services = new Services({
    grpcEndpoint,
    chainId: await getChainId(grpcEndpoint),
    walletId: WalletId.fromJsonString(wallet.id),
    fullViewingKey: FullViewingKey.fromJsonString(wallet.fullViewingKey),
    numeraires: numeraires.map(n => AssetId.fromJsonString(n)),
  });

  const { blockProcessor, indexedDb } = await services.getWalletServices();
  void syncLastBlockToStorage({ indexedDb });
  attachServiceControlListener({ blockProcessor, indexedDb });

  return services;
};

/**
 * Get the chain id from local storage, or the rpc endpoint if no chain id is in
 * local storage.
 */
const getChainId = async (baseUrl: string) => {
  const params =
    (await createPromiseClient(AppService, createGrpcWebTransport({ baseUrl })).appParameters({}))
      .appParameters ??
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

/**
 * Listen for service control messages
 */
const attachServiceControlListener = ({
  blockProcessor,
  indexedDb,
}: Pick<WalletServices, 'blockProcessor' | 'indexedDb'>) =>
  chrome.runtime.onMessage.addListener((req, sender, respond) => {
    if (!isInternalSender(sender) || !(req in ServicesMessage)) {
      return false;
    }
    switch (ServicesMessage[req as keyof typeof ServicesMessage]) {
      case ServicesMessage.ClearCache:
        void (async () => {
          blockProcessor.stop('clearCache');
          await Promise.allSettled([localExtStorage.remove('params'), indexedDb.clear()]);
        })()
          .then(() => respond())
          .finally(() => chrome.runtime.reload());
        break;
      case ServicesMessage.ChangeNumeraires:
        void (async () => {
          const newNumeraires = await localExtStorage.get('numeraires');
          blockProcessor.setNumeraires(newNumeraires.map(n => AssetId.fromJsonString(n)));
          /**
           * Changing numeraires causes all BSOD-based prices to be removed.
           * This means that some new blocks will need to be scanned to get prices for the new numeraires.
           * It also means that immediately after changing numeraires user will not see any equivalent BSOD-based prices.
           */
          await indexedDb.clearSwapBasedPrices();
        })().then(() => respond());
        break;
    }
    return true;
  });
