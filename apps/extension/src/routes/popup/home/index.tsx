import { SelectAccount } from '@repo/ui/components/ui/select';
import { IndexHeader } from './index-header';
import { useStore } from '../../../state';
import { BlockSync } from './block-sync';
import { localExtStorage } from '../../../storage/local';
import { getActiveWallet } from '../../../state/wallets';
import { needsLogin, needsOnboard } from '../popup-needs';
import { Address, FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { getAddressByIndex, getEphemeralByIndex } from '@penumbra-zone/wasm/keys';
import { Wallet } from '@penumbra-zone/types/wallet';
import { ValidateAddress } from './validate-address';
import { FrontendLink } from './frontend-link';

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

  return (
    <>
      <BlockSync />

      <div className='flex h-full grow flex-col items-stretch gap-[15px] bg-logo bg-left-bottom px-[15px] pb-[15px]'>
        <IndexHeader />

        <div className='flex flex-col gap-4'>
          {activeWallet && <SelectAccount getAddrByIndex={getAddrByIndex(activeWallet)} />}
        </div>

        <ValidateAddress />

        <div className='shrink-0 grow' />

        <FrontendLink />
      </div>
    </>
  );
};
