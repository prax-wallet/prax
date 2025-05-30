import { Address, FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { SelectAccount } from '@repo/ui/components/ui/select';
import { getAddressByIndex, getEphemeralByIndex } from '@penumbra-zone/wasm/keys';
import { Wallet } from '@penumbra-zone/types/wallet';
import { IndexHeader } from './index-header';
import { useStore } from '../../../state';
import { BlockSync } from './block-sync';
import { localExtStorage } from '@repo/storage-chrome/local';
import { getActiveWallet } from '../../../state/wallets';
import { needsLogin, needsOnboard } from '../popup-needs';
import { FrontendLink } from './frontend-link';
import { AssetsTable } from './assets-table';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Button } from '@repo/ui/components/ui/button';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Link } from 'react-router-dom';
import { PopupPath } from '../paths';

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
              <Dialog open={showReminder} onOpenChange={setShowReminder}>
                <DialogContent>
                  <div
                    className='mx-auto w-[320px] rounded-2xl bg-background/90 backdrop-blur
                                    shadow-2xl ring-1 ring-white/10 p-7 space-y-6 text-center'
                  >
                    <div className='space-y-3'>
                      <div className='flex items-center justify-center gap-2'>
                        <InfoCircledIcon className='size-5 text-muted-foreground translate-y-[-2px]' />
                        <DialogTitle className='text-xl font-extrabold leading-none'>
                          Reminder
                        </DialogTitle>
                      </div>

                      <DialogDescription className='text-sm leading-relaxed text-muted-foreground'>
                        Back up your seed&nbsp;phrase now&mdash;it’s the only way to recover your
                        wallet.
                        <br></br>
                        <br></br>
                        You can find it anytime in <strong>Security & Privacy</strong>, then{' '}
                        <strong>Recovery passphrase</strong>.
                      </DialogDescription>
                    </div>

                    <DialogFooter>
                      <Button
                        onClick={() => void dismissReminder()}
                        variant='gradient'
                        size='lg'
                        className='w-full rounded-lg shadow-md hover:shadow-lg transition-shadow'
                      >
                        <Link to={PopupPath.SETTINGS_RECOVERY_PASSPHRASE}>Back up now</Link>
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
