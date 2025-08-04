import { Button } from '@repo/ui/components/ui/button';
import { useWindowCountdown } from './use-window-countdown';
import { ReactNode } from 'react';

export const ApproveDeny = ({
  approve,
  approveMsg = 'Approve',
  deny,
  denyMsg = 'Deny',
  ignore,
  ignoreMsg = 'Ignore Site',
}: {
  approve?: () => void;
  approveMsg?: ReactNode;
  deny?: () => void;
  denyMsg?: ReactNode;
  ignore?: () => void;
  ignoreMsg?: ReactNode;
}) => {
  const count = useWindowCountdown();

  return (
    <div className='py-[28px] bg-[#1A1A1A]'>
      <div className='flex flex-row justify-between gap-4 rounded-md p-4 shadow-md'>
        <Button
          variant='gradient'
          className='w-1/2 py-3.5 text-base'
          size='lg'
          onClick={approve}
          disabled={!approve || count > 0}
        >
          {approveMsg}
        </Button>
        <Button
          className='w-1/2 py-3.5 text-base hover:bg-destructive/90'
          size='lg'
          variant='destructiveSecondary'
          onClick={deny}
          disabled={!deny}
        >
          {denyMsg}
        </Button>
        {ignore && (
          <Button
            className='w-1/2 py-3.5 text-base hover:bg-warning/90'
            size='lg'
            variant='secondary'
            onClick={ignore}
          >
            {ignoreMsg}
          </Button>
        )}
      </div>
    </div>
  );
};
