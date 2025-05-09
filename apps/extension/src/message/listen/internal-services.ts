import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { Services } from '@repo/context';
import { isPraxServicesMessage, ServicesMessage } from '../services';
import { isInternalSender } from '../../senders/internal';
import { localExtStorage } from '../../storage/local';

export const internalServiceListener = (
  walletServices: Promise<Services>,
  req: unknown,
  sender: chrome.runtime.MessageSender,
  respond: (response?: unknown) => void,
): boolean => {
  if (!isInternalSender(sender) || !isPraxServicesMessage(req)) {
    return false;
  }

  switch (ServicesMessage[req as keyof typeof ServicesMessage]) {
    case ServicesMessage.ClearCache:
      void (async () => {
        const { blockProcessor, indexedDb } = await walletServices.then(ws =>
          ws.getWalletServices(),
        );
        blockProcessor.stop('clearCache');
        await Promise.allSettled([
          localExtStorage.remove('params'),
          indexedDb.clear(),
          localExtStorage.remove('fullSyncHeight'),
        ]);
      })()
        .then(() => respond())
        .finally(() => chrome.runtime.reload());
      break;
    case ServicesMessage.ChangeNumeraires:
      void (async () => {
        const { blockProcessor, indexedDb } = await walletServices.then(ws =>
          ws.getWalletServices(),
        );
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
};
