import { ChainRegistryClient } from '@penumbra-labs/registry';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { JsonViewer } from '@repo/ui/components/ui/json-viewer';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs';
import { MetadataFetchFn, TransactionViewComponent } from '@repo/ui/components/ui/tx';
import { cn } from '@repo/ui/lib/utils';
import { viewClient } from '../../../clients';
import { useStore } from '../../../state';
import { txApprovalSelector } from '../../../state/tx-approval';
import { ApproveDeny } from './approve-deny';
import { useCallback, useMemo, useState } from 'react';
import { JsonObject } from '@bufbuild/protobuf';

const stakingAssetId = new ChainRegistryClient().bundled.globals().stakingAssetId;

const getMetadata: MetadataFetchFn = async ({ assetId = stakingAssetId }) =>
  (await viewClient.assetMetadataById({ assetId })).denomMetadata;

export const TransactionApproval = () => {
  const { authorizeRequest, sendResponse, setChoice, transactionClassification, views } =
    useStore(txApprovalSelector);

  const enableReceiverView = transactionClassification === 'send';

  const [selectedTransactionViewName, setSelectedTransactionViewName] =
    useState<keyof typeof views>('asSender');

  const hasTransparentAddress = useMemo(() => {
    const txv = views.asSender;
    return (
      txv?.bodyView?.actionViews.some(
        action =>
          action.actionView.case === 'ics20Withdrawal' &&
          action.actionView.value.useTransparentAddress,
      ) ?? false
    );
  }, [views]);

  const hasAltGasFee = useMemo(() => {
    const txv = views.asSender;
    const feeAssetId = txv?.bodyView?.transactionParameters?.fee?.assetId;
    return feeAssetId && !stakingAssetId.equals(feeAssetId);
  }, [views]);

  const txv = useMemo(
    () => views[selectedTransactionViewName],
    [views, selectedTransactionViewName],
  );

  const choose = useCallback(
    (c: UserChoice) => {
      setChoice(c);
      sendResponse();
      window.close();
    },
    [sendResponse, setChoice],
  );

  return (
    authorizeRequest &&
    txv && (
      <div className='flex h-screen flex-col'>
        <div className='border-b border-gray-700 p-4'>
          <h1 className=' bg-text-linear bg-clip-text pb-0 font-headline text-2xl font-bold text-transparent'>
            Confirm Transaction
          </h1>
        </div>
        <div className='grow overflow-auto p-4'>
          {selectedTransactionViewName === 'asSender' && (
            <>
              {hasTransparentAddress && (
                <div className='mb-4 rounded border border-yellow-500 p-2 text-sm text-yellow-500'>
                  <span className='block text-center font-bold'>⚠ Privacy Warning</span>
                  <p>This transaction uses a transparent address which may reduce privacy.</p>
                </div>
              )}
              {hasAltGasFee && (
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
          <Tabs
            defaultValue={selectedTransactionViewName}
            onValueChange={setSelectedTransactionViewName as (v: string) => void}
          >
            <TabsList
              className={cn(
                'mx-auto mb-8 grid w-[100%] gap-4',
                enableReceiverView ? 'grid-cols-3' : 'grid-cols-2',
              )}
            >
              <TabsTrigger value='asSender'>Your View</TabsTrigger>

              {enableReceiverView && (
                <TabsTrigger value='asReceiver'>Receiver&apos;s View</TabsTrigger>
              )}

              <TabsTrigger value='asPublic'>Public View</TabsTrigger>
            </TabsList>
          </Tabs>
          <TransactionViewComponent txv={txv} metadataFetcher={getMetadata} />
          {selectedTransactionViewName === 'asSender' && (
            <div className='mt-2'>
              <JsonViewer jsonObj={authorizeRequest.toJson() as JsonObject} />
            </div>
          )}
        </div>

        <div className='border-t border-gray-700 p-0'>
          <ApproveDeny
            approve={() => choose(UserChoice.Approved)}
            deny={() => choose(UserChoice.Denied)}
            wait={3}
          />
        </div>
      </div>
    )
  );
};
