import { MetadataFetchFn, TransactionViewComponent } from '@repo/ui/components/ui/tx';
import { useStore } from '../../../../state';
import { txApprovalSelector } from '../../../../state/tx-approval';
import { JsonViewer } from '@repo/ui/components/ui/json-viewer';
import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import { useTransactionViewSwitcher } from './use-transaction-view-switcher';
import { ViewTabs } from './view-tabs';
import { ApproveDeny } from '../approve-deny';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import type { Jsonified } from '@penumbra-zone/types/jsonified';
import { TransactionViewTab } from './types';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { viewClient } from '../../../../clients';

const getMetadata: MetadataFetchFn = async ({ assetId }) => {
  const feeAssetId = assetId ? assetId : new ChainRegistryClient().bundled.globals().stakingAssetId;

  const { denomMetadata } = await viewClient.assetMetadataById({ assetId: feeAssetId });
  return denomMetadata;
};

export const TransactionApproval = () => {
  const { authorizeRequest: authReqString, setChoice, sendResponse } = useStore(txApprovalSelector);

  const { selectedTransactionView, selectedTransactionViewName, setSelectedTransactionViewName } =
    useTransactionViewSwitcher();

  if (!authReqString) {
    return null;
  }
  const authorizeRequest = AuthorizeRequest.fromJsonString(authReqString);
  if (!authorizeRequest.plan || !selectedTransactionView) {
    return null;
  }

  const approve = () => {
    setChoice(UserChoice.Approved);
    sendResponse();
    window.close();
  };

  const deny = () => {
    setChoice(UserChoice.Denied);
    sendResponse();
    window.close();
  };

  return (
    <div className='flex h-screen flex-col'>
      <div className='border-b border-gray-700 p-4'>
        <h1 className=' bg-text-linear bg-clip-text pb-0 font-headline text-2xl font-bold text-transparent'>
          Confirm Transaction
        </h1>
      </div>
      <div className='grow overflow-auto p-4'>
        <ViewTabs
          defaultValue={selectedTransactionViewName}
          onValueChange={setSelectedTransactionViewName}
        />

        <TransactionViewComponent txv={selectedTransactionView} metadataFetcher={getMetadata} />

        {selectedTransactionViewName === TransactionViewTab.SENDER && (
          <div className='mt-4'>
            <JsonViewer jsonObj={authorizeRequest.toJson() as Jsonified<AuthorizeRequest>} />
          </div>
        )}
      </div>

      <div className='border-t border-gray-700 p-0'>
        <ApproveDeny approve={approve} deny={deny} wait={3} />
      </div>
    </div>
  );
};
