import { SelectAccount } from '@repo/ui/components/ui/select';
import { getAddressByIndex, getEphemeralByIndex } from '@penumbra-zone/wasm/keys';
import { IndexHeader } from './index-header';
import { useStore } from '../../../state';
import { BlockSync } from './block-sync';
import { localExtStorage } from '../../../storage/local';
import { fvkSelector } from '../../../state/wallets';
import { needsLogin, needsOnboard } from '../popup-needs';
import { ValidateAddress } from './validate-address';
import { FrontendLink } from './frontend-link';
import { AssetsTable } from './assets-table';
import { useMemo, useState } from 'react';

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

export const PopupIndex = () => {
  const fvk = useStore(fvkSelector);

  const [addressIndex, setAddressIndex] = useState<number>(0);
  const [addressEphemeral, setAddressEphemeral] = useState<boolean>(false);

  const address = useMemo(() => {
    if (!fvk) {
      return;
    } else if (addressEphemeral) {
      return getEphemeralByIndex(fvk, addressIndex);
    } else {
      return getAddressByIndex(fvk, addressIndex);
    }
  }, [fvk, addressIndex, addressEphemeral]);

  return (
    <>
      <div className='fixed top-0 left-0 w-screen h-screen bg-logoImg bg-[left_-180px] bg-no-repeat pointer-events-none' />
      <div className='fixed top-0 left-0 w-screen h-screen bg-logo pointer-events-none' />

      <div className='z-[1] flex flex-col h-full'>
        <BlockSync />

        <div className='flex h-full grow flex-col items-stretch gap-[15px] px-[15px] pb-[15px]'>
          <IndexHeader />

          <div className='flex flex-col gap-4'>
            {fvk && (
              <SelectAccount
                address={address}
                ephemeral={addressEphemeral}
                setEphemeral={setAddressEphemeral}
                index={addressIndex}
                setIndex={setAddressIndex}
              />
            )}
          </div>

          <ValidateAddress />

          <FrontendLink />

          <AssetsTable account={addressIndex} />
        </div>
      </div>
    </>
  );
};
