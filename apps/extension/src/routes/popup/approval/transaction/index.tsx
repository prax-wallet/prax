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
import { useState } from 'react';

const getMetadata: MetadataFetchFn = async ({ assetId }) => {
  const feeAssetId = assetId ? assetId : new ChainRegistryClient().bundled.globals().stakingAssetId;

  const { denomMetadata } = await viewClient.assetMetadataById({ assetId: feeAssetId });
  return denomMetadata;
};

export const TransactionApproval = () => {
  const { authorizeRequest: authReqString, setChoice, sendResponse } = useStore(txApprovalSelector);

  const { selectedTransactionView, selectedTransactionViewName, setSelectedTransactionViewName } =
    useTransactionViewSwitcher();

  const [symbol, setSymbol] = useState<string>('Unknown asset');

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
      <div className='flex grow flex-col overflow-auto p-[30px] pt-10'>
        {selectedTransactionViewName === TransactionViewTab.SENDER && symbol !== 'UM' && (
          <div
            style={{ marginBottom: '16px' }}
            className='rounded border border-yellow-500 p-2 text-yellow-500 text-sm'
          >
            <span className='block text-center font-bold'>⚠ Privacy Warning:</span>
            Transaction uses a non-native fee token. To reduce gas costs and protect your privacy,
            maintain an UM balance for fees.
          </div>
        )}

        <p className='bg-text-linear bg-clip-text pb-2 font-headline text-2xl font-bold text-transparent'>
          Confirm transaction
        </p>

        <ViewTabs
          defaultValue={selectedTransactionViewName}
          onValueChange={setSelectedTransactionViewName}
        />

        <TransactionViewComponent
          txv={selectedTransactionView}
          metadataFetcher={getMetadata}
          fetchSymbol={symbol => setSymbol(symbol)}
        />

        {selectedTransactionViewName === TransactionViewTab.SENDER && (
          <div className='mt-8'>
            <JsonViewer jsonObj={authorizeRequest.toJson() as Jsonified<AuthorizeRequest>} />
          </div>
        )}
      </div>

      <ApproveDeny approve={approve} deny={deny} wait={3} />
    </div>
  );
};
