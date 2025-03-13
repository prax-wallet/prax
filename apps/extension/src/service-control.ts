import { ConnectError } from '@connectrpc/connect';
import { errorToJson } from '@connectrpc/connect/protocol-connect';
import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { BlockProcessorInterface } from '@penumbra-zone/types/block-processor';
import { IndexedDbInterface } from '@penumbra-zone/types/indexed-db';
import {
  InternalFailure,
  InternalRequestData,
  InternalRequestType,
  InternalResponse,
  isInternalRequest,
} from './message/internal';
import { DatabaseRequest } from './message/services';
import { isInternalSender } from './senders/internal';
import { localExtStorage } from './storage/local';

/**
 * Listen for service control messages
 */
export const attachServiceControlListener = (
  blockProcessor: BlockProcessorInterface,
  indexedDb: IndexedDbInterface,
) => {
  console.debug('attachServiceControlListener', blockProcessor, indexedDb);
  const listener = (
    request: unknown,
    sender: chrome.runtime.MessageSender,
    respond: (r?: unknown) => void,
  ) => {
    if (isInternalSender(sender) && isInternalRequest(InternalRequestType.Database, request)) {
      void handleDatabaseControl(
        blockProcessor,
        indexedDb,
        request[InternalRequestType.Database],
        respond,
      );
      return true;
    }
    return false;
  };

  chrome.runtime.onMessage.addListener(listener);
};

const handleDatabaseControl = async (
  blockProcessor: BlockProcessorInterface,
  indexedDb: IndexedDbInterface,
  databaseRequest: InternalRequestData<InternalRequestType.Database>,
  respond: (r: InternalResponse<InternalRequestType.Database> | InternalFailure) => void,
) => {
  console.debug('handleDatabaseControl', blockProcessor, indexedDb, databaseRequest);
  try {
    switch (databaseRequest) {
      case DatabaseRequest.ClearCache:
        {
          blockProcessor.stop('clearCache');
          const clearStorage = [
            localExtStorage.remove('params'),
            localExtStorage.remove('fullSyncHeight'),
          ];
          const clearIdb = indexedDb.clear();
          await Promise.allSettled([...clearStorage, clearIdb]);
        }
        break;
      case DatabaseRequest.ChangeNumeraires:
        {
          const newNumerairesJson = await localExtStorage.get('numeraires');
          const newNumeraires = newNumerairesJson.map(n => AssetId.fromJsonString(n));
          blockProcessor.setNumeraires(newNumeraires);
          await indexedDb.clearSwapBasedPrices();
        }
        break;
      default:
        throw new TypeError('Unknown database request', { cause: databaseRequest });
    }
    respond({ Database: null });
  } catch (err) {
    respond({ error: errorToJson(ConnectError.from(err), undefined) });
  }
};
