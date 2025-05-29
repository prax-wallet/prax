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
import { TransactionView } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';

const getMetadata: MetadataFetchFn = async ({ assetId }) => {
  const feeAssetId = assetId ? assetId : new ChainRegistryClient().bundled.globals().stakingAssetId;

  const { denomMetadata } = await viewClient.assetMetadataById({ assetId: feeAssetId });
  return denomMetadata;
};

const hasAltGasFee = (txv?: TransactionView): boolean => {
  const { stakingAssetId } = new ChainRegistryClient().bundled.globals();
  let feeAssetId = txv?.bodyView?.transactionParameters?.fee?.assetId;
  if (feeAssetId === undefined) {
    feeAssetId = stakingAssetId;
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we enforce that it's a defined value.
  return feeAssetId!.equals(stakingAssetId);
};

const hasTransparentAddress = (txv?: TransactionView): boolean => {
  return (
    txv?.bodyView?.actionViews.some(
      action =>
        action.actionView.case === 'ics20Withdrawal' &&
        action.actionView.value.useTransparentAddress,
    ) ?? false
  );
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
        {selectedTransactionViewName === TransactionViewTab.SENDER && (
          <>
            {hasTransparentAddress(selectedTransactionView) && (
              <div className='mb-4 rounded border border-yellow-500 p-2 text-sm text-yellow-500'>
                <span className='block text-center font-bold'>⚠ Privacy Warning</span>
                <p>This transaction uses a transparent address which may reduce privacy.</p>
              </div>
            )}
            {!hasAltGasFee(selectedTransactionView) && (
              <div className='mb-4 rounded border border-yellow-500 p-2 text-sm text-yellow-500'>
                <span className='block text-center font-bold'>⚠ Privacy Warning</span>
                <p>
                  Transaction uses a non-native fee token. To reduce gas costs and protect your
                  privacy, maintain an UM balance for fees.
                </p>
              </div>
            )}
          </>
        )}
        <ViewTabs
          defaultValue={selectedTransactionViewName}
          onValueChange={setSelectedTransactionViewName}
        />

        <TransactionViewComponent txv={selectedTransactionView} metadataFetcher={getMetadata} />

        {selectedTransactionViewName === TransactionViewTab.SENDER && (
          <div className='mt-2'>
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
