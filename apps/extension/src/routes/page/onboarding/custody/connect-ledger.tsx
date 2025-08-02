import { BackIcon } from '@repo/ui/components/ui/icons/back-icon';
import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { cn } from '@repo/ui/lib/utils';
import { usePageNav } from '../../../../utils/navigate';
import { useCallback, useState } from 'react';
import { bech32mFullViewingKey } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { SEED_PHRASE_ORIGIN } from '../password/types';
import { navigateToPasswordPage } from '../password/utils';
import { useStore } from '../../../../state';
import { ledgerSelector } from '../../../../state/ledger';
import { bech32mAddress } from '@penumbra-zone/bech32m/penumbra';

const LedgerIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path
      d='M3 7V4.5C3 3.67157 3.67157 3 4.5 3H9M14 15.0001H11.5C10.6716 15.0001 10 14.3285 10 13.5001V9.00012M21 7V4.5C21 3.67157 20.3284 3 19.5 3H15M3 17V19.5C3 20.3284 3.67157 21 4.5 21H9M21 17V19.5C21 20.3284 20.3284 21 19.5 21H15'
      stroke='white'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

export const ConnectLedgerWallet = () => {
  const navigate = usePageNav();

  const [ledgerConnectionPending, setLedgerConnectionPending] = useState(false);
  const [ledgerFailure, setLedgerFailure] = useState<Error | null>(null);
  const [ledgerConnected, setLedgerConnected] = useState(false);

  const { fullViewingKey, address, setFullViewingKey, setAddress, clearLedgerData } =
    useStore(ledgerSelector);

  const attemptLedgerConnection = useCallback(async () => {
    setLedgerConnectionPending(true);
    setLedgerFailure(null);
    clearLedgerData();

    try {
      // For now, simulate ledger connection and show placeholder data
      // In a real implementation, this would use the custody system
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate connection delay

      // Mock Ledger connection success
      setLedgerConnected(true);

      // TODO: Replace with actual Ledger integration through custody system
      // This is a placeholder implementation for the UI integration
      const mockFullViewingKey = {
        inner: new Uint8Array(64), // Mock FVK data
      };
      const mockAddress = {
        inner: new Uint8Array(80), // Mock address data
      };

      setFullViewingKey(mockFullViewingKey);
      setAddress(mockAddress);
    } catch (cause) {
      setLedgerFailure(
        cause instanceof Error ? cause : new Error(`Unknown failure: ${String(cause)}`, { cause }),
      );
    } finally {
      setLedgerConnectionPending(false);
    }
  }, [setFullViewingKey, setAddress, clearLedgerData]);

  return (
    <FadeTransition>
      <BackIcon className='float-left mb-4' onClick={() => navigate(-1)} />
      <Card className={cn('p-6', 'w-[600px]')} gradient>
        <CardHeader className='items-center'>
          <CardTitle className='font-semibold'>Connect Ledger</CardTitle>
          <CardDescription className='text-center'>
            {ledgerFailure && (
              <span className='text-red-500'>
                Ledger failed to connect: {ledgerFailure.message}
              </span>
            )}
            {!ledgerConnected && !ledgerFailure && !ledgerConnectionPending && (
              <>Please connect your Ledger device and open the Penumbra app.</>
            )}
            {ledgerConnectionPending && <>Connecting to Ledger device...</>}
            {ledgerConnected && !fullViewingKey && (
              <>Connected to Ledger device, requesting view key...</>
            )}
            {fullViewingKey && (
              <div className='space-y-2'>
                <div>Successfully connected to Ledger device.</div>
                <div className='font-mono text-sm break-all'>
                  {bech32mFullViewingKey(fullViewingKey)}
                </div>
                {address && (
                  <div className='font-mono text-sm break-all'>{bech32mAddress(address)}</div>
                )}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-row justify-center gap-4'>
            <Button
              disabled={!!ledgerConnectionPending || !!ledgerConnected}
              variant='gradient'
              className='mt-4'
              onClick={() => void attemptLedgerConnection()}
            >
              {ledgerConnectionPending ? 'Connecting...' : 'Connect'}
              &nbsp;
              <LedgerIcon className='inline-block' />
            </Button>
            <Button
              disabled={!fullViewingKey}
              variant='gradient'
              className='mt-4'
              onClick={() => navigateToPasswordPage(navigate, SEED_PHRASE_ORIGIN.LEDGER)}
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </FadeTransition>
  );
};
