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
import { useCallback, useEffect, useState } from 'react';
import { bech32mFullViewingKey } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { SEED_PHRASE_ORIGIN } from '../password/types';
import { navigateToPasswordPage } from '../password/utils';
import { useStore } from '../../../../state';
import { ledgerSelector } from '../../../../state/onboarding/ledger';
import { bech32mAddress } from '@penumbra-zone/bech32m/penumbra';
import { getFirstUsb, LedgerPenumbra } from '../../../../authorize/ledger/getLedgerUsb';

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
  const [ledgerPenumbra, setLedgerPenumbra] = useState<LedgerPenumbra>();

  const { fullViewingKey, address, setFullViewingKey, setAddress } = useStore(ledgerSelector);

  const attemptLedgerConnection = useCallback(async () => {
    setLedgerConnectionPending(true);
    try {
      const dev = await getFirstUsb();
      setLedgerPenumbra(await LedgerPenumbra.connect(dev));
    } catch (cause) {
      setLedgerFailure(
        cause instanceof Error ? cause : new Error(`Unknown failure: ${String(cause)}`, { cause }),
      );
    } finally {
      setLedgerConnectionPending(false);
    }
  }, []);

  useEffect(() => {
    if (ledgerPenumbra) {
      void Promise.resolve(ledgerPenumbra).then(async ledger => {
        setFullViewingKey(await ledger.getFullViewingKey());
        setAddress(await ledger.getAddress());
      });
    }
  }, [ledgerPenumbra]);

  return (
    <FadeTransition>
      <BackIcon className='float-left mb-4' onClick={() => navigate(-1)} />
      <Card className={cn('p-6', 'w-[600px]')} gradient>
        <CardHeader className='items-center'>
          <CardTitle className='font-semibold'>Connect Ledger</CardTitle>
          <CardDescription>
            {ledgerFailure && (
              <span className='text-error'>Ledger failed to connect: {ledgerFailure.message}</span>
            )}
            {!ledgerPenumbra && <>Activate your Ledger wallet.</>}
            {ledgerPenumbra && !fullViewingKey && (
              <>Connected to Ledger device, requesting view key...</>
            )}
            {fullViewingKey && (
              <>
                Successfully connected to Ledger device.
                {bech32mFullViewingKey(fullViewingKey)}
                {address && bech32mAddress(address)}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-row justify-center gap-4'>
            <Button
              disabled={!!ledgerConnectionPending || !!ledgerPenumbra}
              variant='gradient'
              className='mt-4'
              onClick={() => void attemptLedgerConnection()}
            >
              Connect&nbsp;
              <LedgerIcon className='inline-block' />
            </Button>
            <Button
              disabled={!fullViewingKey}
              variant='gradient'
              className='mt-4'
              onClick={() => navigateToPasswordPage(navigate, SEED_PHRASE_ORIGIN.NONE)}
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </FadeTransition>
  );
};
