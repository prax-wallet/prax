import { ChainRegistryClient } from '@penumbra-labs/registry';
import type { TransactionView } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import type { Jsonified } from '@penumbra-zone/types/jsonified';
import { UserChoice } from '@repo/storage-chrome/records';
import { JsonViewer } from '@repo/ui/components/ui/json-viewer';
import { MetadataFetchFn, TransactionViewComponent } from '@repo/ui/components/ui/tx';
import { useCallback, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { viewClient } from '../../../../clients';
import type { PopupReadyContext } from '../../../../hooks/popup-ready';
import { useStore } from '../../../../state';
import { txApprovalSelector } from '../../../../state/tx-approval';
import { ApprovalControls } from './approval-controls';
import { TransactionViewTab } from './types';
import { useTransactionViewSwitcher } from './use-transaction-view-switcher';
import { ViewTabs } from './view-tabs';

const getMetadata: MetadataFetchFn = async ({ assetId }) => {
  const feeAssetId = assetId ? assetId : new ChainRegistryClient().bundled.globals().stakingAssetId;

  const { denomMetadata } = await viewClient.assetMetadataById({ assetId: feeAssetId });
  return denomMetadata;
};

const hasAltGasFee = (txv?: TransactionView): boolean => {
  const { stakingAssetId } = new ChainRegistryClient().bundled.globals();
  const feeAssetId = txv?.bodyView?.transactionParameters?.fee?.assetId ?? stakingAssetId;

  return feeAssetId.equals(stakingAssetId);
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
  const { setAttentionRequired } = useOutletContext<PopupReadyContext>();

  const {
    authorizeRequest,
    choice,
    ready,
    custodyType,
    checkReady,
    sendResponse,
    setChoice,
    auth,
    beginAuth,
    hasError,
  } = useStore(txApprovalSelector);

  const { selectedTransactionView, selectedTransactionViewName, setSelectedTransactionViewName } =
    useTransactionViewSwitcher();

  const approve = useCallback(() => {
    setChoice(UserChoice.Approved);
  }, [setChoice]);

  const deny = useCallback(() => {
    setChoice(UserChoice.Denied);
    // send denial immediately
    sendResponse();
  }, [setChoice, sendResponse]);

  useEffect(() => {
    if (!custodyType) {
      return;
    }

    // once a choice is selected, the user may defocus the popup
    setAttentionRequired(!choice);

    // usb devices replace the choice mechanism
    if (custodyType === 'ledgerUsb' && !choice) {
      setChoice(UserChoice.Approved);
    }

    if (!ready) {
      // check ready at least once automatically
      void checkReady();
    } else if (ready === true && !auth) {
      // begin authorization automatically
      void beginAuth();
    } else if (choice && auth) {
      // send response automatically when complete
      void Promise.resolve(auth).then(() => sendResponse());
    }
  }, [hasError, ready, auth, beginAuth, setAttentionRequired, sendResponse, custodyType, choice]);

  return (
    <div className='flex h-screen flex-col'>
      <div className='border-b border-gray-700 p-4 text-gray-700 place-content-between flex flex-row'>
        <h1 className='bg-text-linear bg-clip-text pb-0 font-headline text-2xl font-bold text-transparent'>
          Confirm Transaction
        </h1>
      </div>

      <div className='grow overflow-auto p-4'>
        {selectedTransactionView && selectedTransactionViewName === TransactionViewTab.SENDER && (
          <>
            {hasTransparentAddress(selectedTransactionView) && (
              <div className='mb-4 rounded border content-center border-yellow-500 p-2 text-sm text-yellow-500'>
                <h2>⚠ Privacy Warning</h2>
                <p>This transaction uses a transparent address which may reduce privacy.</p>
              </div>
            )}
            {!hasAltGasFee(selectedTransactionView) && (
              <div className='mb-4 rounded border content-center border-yellow-500 p-2 text-sm text-yellow-500'>
                <h2>⚠ Privacy Warning</h2>
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

        {selectedTransactionView && (
          <TransactionViewComponent txv={selectedTransactionView} metadataFetcher={getMetadata} />
        )}

        {selectedTransactionViewName === TransactionViewTab.SENDER && (
          <div className='mt-2'>
            <JsonViewer
              jsonObj={
                new AuthorizeRequest(authorizeRequest).toJson() as Jsonified<AuthorizeRequest>
              }
            />
          </div>
        )}
      </div>
      <div className='border-t border-gray-700 p-0'>
        <ApprovalControls approve={approve} deny={deny} />
      </div>
    </div>
  );
};
