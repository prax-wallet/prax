import { Address } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { SelectAccount } from '@repo/ui/components/ui/select';
import { getAddressByIndex, getEphemeralByIndex } from '@penumbra-zone/wasm/keys';
import { Wallet } from '@repo/wallet';
import { IndexHeader } from './index-header';
import { useStore } from '../../../state';
import { BlockSync } from './block-sync';
import { localExtStorage } from '@repo/storage-chrome/local';
import { getActiveWallet } from '../../../state/wallets';
import { needsLogin, needsOnboard } from '../popup-needs';
import { FrontendLink } from './frontend-link';
import { AssetsTable } from './assets-table';
import { useEffect, useState } from 'react';
import { ReminderDialog } from './reminder-dialog';

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

    const fullViewingKey = wallet.fullViewingKey;
    return ephemeral
      ? getEphemeralByIndex(fullViewingKey, index)
      : getAddressByIndex(fullViewingKey, index);
  };

export const PopupIndex = () => {
  const activeWallet = useStore(getActiveWallet);
  const [index, setIndex] = useState<number>(0);
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    const checkReminder = async () => {
      if ((await localExtStorage.get('backupReminderSeen')) === false) {
        setShowReminder(true);
      }
    };

    void checkReminder();
  }, []);

  const dismissReminder = async () => {
    await localExtStorage.set('backupReminderSeen', true);
    setShowReminder(false);
  };

  return (
    <>
      <div className='z-[1] flex flex-col min-h-full'>
        <div className='fixed inset-0 overflow-y-auto bg-card-radial pt-[15px]'>
          <div className='absolute top-0 left-0 right-0 z-10'>
            <BlockSync />
          </div>
          <div className='flex flex-col items-stretch gap-[15px] px-[15px] pb-[15px]'>
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
            <FrontendLink />
            <AssetsTable account={index} />

            {showReminder && (
              <ReminderDialog
                showReminder={showReminder}
                setShowReminder={setShowReminder}
                dismissReminder={dismissReminder}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
