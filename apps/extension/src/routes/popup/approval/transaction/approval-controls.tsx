import { useMemo } from 'react';
import { useStore } from '../../../../state';
import { txApprovalSelector } from '../../../../state/tx-approval';
import { Button } from '@repo/ui/components/ui/button';
import { cn } from '@repo/ui/lib/utils';
import { ConnectError } from '@connectrpc/connect';

export const ApprovalControls = ({
  approve: approveFn,
  deny,
}: {
  approve: () => void;
  deny: () => void;
}) => {
  const { custodyType, choice, resetReady, auth, invalidPlan, ready, hasError } =
    useStore(txApprovalSelector);

  const needsUsb = useMemo(() => custodyType && ['ledgerUsb'].includes(custodyType), [custodyType]);

  const { approve, approveMsg } = useMemo(() => {
    if (invalidPlan) {
      return { approveMsg: 'Invalid' };
    }

    if (needsUsb) {
      return { approveMsg: 'See Ledger' };
    }

    if (choice) {
      return { approveMsg: 'Authorizing...' };
    }

    return { approve: approveFn, approveMsg: 'Approve' };
  }, [choice, invalidPlan, approveFn, needsUsb]);

  return (
    <div className={cn('py-[28px] bg-[#1A1A1A]')}>
      <div
        hidden={!hasError}
        className={cn(
          'flex flex-col justify-items-center items-center text-center gap-2 rounded-md',
          'mb-[14px] -mt-[14px]',
        )}
      >
        {invalidPlan && (
          <div className='border-red-500 text-red-500'>
            <h2 className='text-headline'>⚠ Cannot Authorize</h2>
            <p className='text-body'>
              {invalidPlan instanceof ConnectError ? invalidPlan.rawMessage : String(invalidPlan)}
            </p>
          </div>
        )}
        {ready instanceof Error && (
          <div className='border-yellow-500 text-yellow-500'>
            <h2 className='text-headline'>⚠ Not ready</h2>
            <p className='text-body'>
              {ready instanceof ConnectError ? ready.rawMessage : String(ready)}
            </p>
          </div>
        )}
      </div>
      <div className='flex flex-row justify-between gap-4 rounded-md p-4 pt-0 shadow-md'>
        {ready === true && (
          <Button
            variant={!needsUsb ? 'gradient' : 'default'}
            className='w-1/2 py-3.5 text-base'
            size='lg'
            onClick={!needsUsb ? approve : () => null}
            disabled={!!choice}
          >
            {approveMsg}
          </Button>
        )}
        {(!!hasError || !auth || !ready) && (
          <Button
            className={cn(
              'group/retry',
              'w-1/2 py-3.5 text-base',
              ready instanceof Promise ? 'hover:bg-destructive/90' : 'hover:bg-secondary/90',
            )}
            size='lg'
            variant='secondary'
            onClick={resetReady}
          >
            <div className='group/retry inline-block group-hover/retry:hidden'>
              {ready instanceof Promise ? 'Preparing...' : 'Try Again'}
            </div>
            <div className='group/retry hidden group-hover/retry:inline-block'>Restart</div>
          </Button>
        )}
        <Button
          className='w-1/2 py-3.5 text-base hover:bg-destructive/90'
          size='lg'
          variant='destructiveSecondary'
          onClick={deny}
          disabled={!deny}
        >
          Deny
        </Button>
      </div>
    </div>
  );
};
