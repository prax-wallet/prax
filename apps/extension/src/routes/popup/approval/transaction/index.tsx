import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import type { Jsonified } from '@penumbra-zone/types/jsonified';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { JsonViewer } from '@repo/ui/components/ui/json-viewer';
import { TransactionViewComponent } from '@repo/ui/components/ui/tx';
import { useStore } from '../../../../state';
import { txApprovalSelector } from '../../../../state/tx-approval';
import { ApproveDeny } from '../approve-deny';
import { getMetadata } from './get-metadata';
import { hasAltGasFee } from './has-alt-gas-fee';
import { hasTransparentAddress } from './has-transparent-address';
import { TransactionViewTab } from './types';
import { useTransactionViewSwitcher } from './use-transaction-view-switcher';
import { ViewTabs } from './view-tabs';
import { ConnectError } from '@connectrpc/connect';

export const TransactionApproval = () => {
  const { authorizeRequest, setChoice, sendResponse, invalidPlan } = useStore(txApprovalSelector);

  const { selectedTransactionView, selectedTransactionViewName, setSelectedTransactionViewName } =
    useTransactionViewSwitcher();

  if (!authorizeRequest?.plan || !selectedTransactionView) {
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
        {invalidPlan && (
          <div className='mb-4 rounded border content-center border-red-500 p-2 text-sm text-red-500 text-center'>
            <h2>⚠ Invalid Transaction</h2>
            <p>
              {invalidPlan instanceof ConnectError ? invalidPlan.rawMessage : invalidPlan.message}
            </p>
          </div>
        )}

        {selectedTransactionViewName === TransactionViewTab.SENDER && (
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

        <TransactionViewComponent txv={selectedTransactionView} metadataFetcher={getMetadata} />

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
        <ApproveDeny approve={invalidPlan ? undefined : approve} deny={deny} wait={3} />
      </div>
    </div>
  );
};
