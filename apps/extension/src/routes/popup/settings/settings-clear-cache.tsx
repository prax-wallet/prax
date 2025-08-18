import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/ui/button';
import { useEffect, useState } from 'react';
import { TrashGradientIcon } from '../../../icons/trash-gradient';
import { ServicesMessage } from '../../../message/services';
import { SettingsScreen } from './settings-screen';
import { useCountdown } from 'usehooks-ts';

export const SettingsClearCache = () => {
  const [pending, setPending] = useState(false);
  const [count, { startCountdown }] = useCountdown({ countStart: 3, countStop: 0 });

  useEffect(() => {
    if (pending && count === 0) {
      void chrome.runtime.sendMessage(ServicesMessage.ClearCache);
    }
  }, [count, pending]);

  return (
    <SettingsScreen title='Clear Cache' IconComponent={TrashGradientIcon}>
      <div className='flex flex-1 flex-col items-start justify-between px-[30px] pb-5'>
        <div className='flex flex-col items-center gap-2'>
          <p className='font-headline text-base font-semibold'>Are you sure?</p>
          <p className='mt-2 flex gap-2 font-headline text-base font-semibold text-rust'>
            <ExclamationTriangleIcon className='size-[30px]' />
            Prax will need to resync the entire state.
          </p>
          <p className='text-muted-foreground'>Your private keys will not be deleted.</p>
        </div>
        <Button
          disabled={pending}
          variant='gradient'
          size='lg'
          className='w-full'
          onClick={() => {
            setPending(true);
            startCountdown();
          }}
        >
          {pending ? `Clearing cache in ${count}...` : 'Confirm'}
        </Button>
      </div>
    </SettingsScreen>
  );
};
