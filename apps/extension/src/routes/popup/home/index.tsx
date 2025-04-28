import { Address, FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { SelectAccount } from '@repo/ui/components/ui/select';
import { getAddressByIndex, getEphemeralByIndex } from '@penumbra-zone/wasm/keys';
import { Wallet } from '@penumbra-zone/types/wallet';
import { IndexHeader } from './index-header';
import { useStore } from '../../../state';
import { BlockSync } from './block-sync';
import { localExtStorage } from '@repo/prax-storage/local';
import { getActiveWallet } from '../../../state/wallets';
import { needsLogin, needsOnboard } from '../popup-needs';
import { ValidateAddress } from './validate-address';
import { FrontendLink } from './frontend-link';
import { AssetsTable } from './assets-table';
import { useState } from 'react';

export interface PopupLoaderData {
  fullSyncHeight?: number;
}

// Because Zustand initializes default empty (prior to persisted storage synced),
// We need to manually check storage for accounts & password in the loader.
// Will redirect to onboarding or password check if necessary.
export const popupIndexLoader = async (): Promise<Response | PopupLoaderData> => {
  await needsOnboard();
  const redirect = await needsLogin();
  if (redirect) {
    return redirect;
  }

  return {
    fullSyncHeight: await localExtStorage.get('fullSyncHeight'),
  };
};

const getAddrByIndex =
  (wallet?: Wallet) =>
  (index: number, ephemeral: boolean): Address => {
    if (!wallet) {
      throw new Error('No active wallet');
    }

    const fullViewingKey = FullViewingKey.fromJsonString(wallet.fullViewingKey);
    return ephemeral
      ? getEphemeralByIndex(fullViewingKey, index)
      : getAddressByIndex(fullViewingKey, index);
  };

export const PopupIndex = () => {
  const activeWallet = useStore(getActiveWallet);
  const [index, setIndex] = useState<number>(0);

  return (
    <>
      <div className='fixed top-0 left-0 w-screen h-screen bg-logoImg bg-[left_-180px] bg-no-repeat pointer-events-none' />
      <div className='fixed top-0 left-0 w-screen h-screen bg-logo pointer-events-none' />

      <div className='z-[1] flex flex-col h-full'>
        <BlockSync />

        <div className='flex h-full grow flex-col items-stretch gap-[15px] px-[15px] pb-[15px]'>
          <IndexHeader />

          <div className='flex flex-col gap-4'>
            {activeWallet && (
              <SelectAccount
                index={index}
                setIndex={setIndex}
                getAddrByIndex={getAddrByIndex(activeWallet)}
              />
            )}
          </div>

          <ValidateAddress />

          <FrontendLink />

          <AssetsTable account={index} />
        </div>
      </div>
    </>
  );
};
