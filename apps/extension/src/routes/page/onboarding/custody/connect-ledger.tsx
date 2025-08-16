import { bech32mAddress } from '@penumbra-zone/bech32m/penumbra';
import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { BackIcon } from '@repo/ui/components/ui/icons/back-icon';
import { cn } from '@repo/ui/lib/utils';
import { PenumbraApp } from '@zondax/ledger-penumbra';
import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../../../../state';
import { selectOnboardingLedger } from '../../../../state/onboarding/connect-ledger';
import { usePageNav } from '../../../../utils/navigate';
import { PagePath } from '../../paths';
import { LedgerIcon } from './ledger-icon';
import { LineWave } from 'react-loader-spinner';

export const ConnectLedger = () => {
  const navigate = usePageNav();
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [failure, setFailure] = useState<Error | null>(null);
  const [ledgerApp, setLedgerApp] = useState<PenumbraApp | null>(null);
  const [usbDevice, setUsbDevice] = useState<USBDevice | null>(null);
  const {
    requestPairingDevice,
    connectLedgerApp,
    address,
    fullViewingKey,
    getAddress,
    getFullViewingKey,
    clearLedgerState,
    getAppInfo,
    appInfo,
  } = useStore(selectOnboardingLedger);

  const stop = useCallback(
    (cause: unknown) => {
      setComplete(false);
      setPending(false);
      if (cause == null) {
        setFailure(null);
      } else {
        console.error(cause);
        setFailure(
          cause instanceof Error
            ? cause
            : new Error(`Unknown failure: ${String(cause as unknown)}`, { cause }),
        );
      }
    },
    [clearLedgerState, setFailure, setPending, setUsbDevice, setLedgerApp],
  );

  useEffect(() => {
    console.log('useEffect', {
      pending,
      usbDevice,
      ledgerApp,
      fullViewingKey,
      address,
      appInfo,
    });
    if (pending || complete || failure) {
      return;
    }

    if (usbDevice) {
      setPending(true);

      let step: undefined | Promise<void> = undefined;

      if (!ledgerApp) {
        step = connectLedgerApp(usbDevice).then(setLedgerApp);
      } else if (!appInfo) {
        step = getAppInfo(ledgerApp);
      } else if (!fullViewingKey) {
        step = getFullViewingKey(ledgerApp);
      } else if (!address) {
        step = getAddress(ledgerApp).then(() => setComplete(true));
      }

      void Promise.resolve(step)
        .catch(stop)
        .finally(() => setPending(false));
    }
  }, [ledgerApp, fullViewingKey, address, pending, getFullViewingKey, getAddress, usbDevice]);

  return (
    <FadeTransition>
      <BackIcon className='float-left mb-4' onClick={() => navigate(-1)} />
      <Card className={cn('p-6', 'w-[600px]')} gradient>
        <CardHeader className='items-center'>
          <CardTitle className='font-semibold'>Connect Ledger</CardTitle>
          <CardDescription className='text-center'>
            {!complete && !failure && !pending && (
              <>
                {/** @todo: add link to app store? */}
                <div>Install the Penumbra app on your Ledger device.</div>
                <div>Attach your Ledger device via USB.</div>
              </>
            )}
            {failure && 'Failed'}
            {pending && (
              <LineWave
                visible={true}
                height='60'
                width='60'
                color='#FFFFFF'
                wrapperClass='mt-[-17.5px] mr-[-21px]'
              />
            )}
            {complete && <div>Connected. </div>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='text-center font-semibold'>
            {pending && !usbDevice && (
              <>
                <div>Make sure your device is unlocked, and open the Penumbra app.</div>
                <div>Select your Ledger device in the browser modal.</div>
              </>
            )}
            {usbDevice && <div>Claimed Ledger USB device...</div>}
            {ledgerApp && <div>Obtaining app info...</div>}
            {appInfo && <div>Obtaining viewing key...</div>}
            {fullViewingKey && <div>Obtaining address...</div>}
            {address && <div>Success!</div>}
            {address && (
              <>
                <div>Ledger device Address 0:</div>
                <div className='font-mono text-muted-foreground break-all'>
                  {bech32mAddress(address)}
                </div>
              </>
            )}
            {failure && <div className='text-rust'>{String(failure)}</div>}
          </div>
          <div className='flex flex-row justify-center gap-4'>
            <Button
              disabled={pending || complete}
              variant='gradient'
              className='mt-4'
              onClick={() => {
                setFailure(null);
                setLedgerApp(null);
                setUsbDevice(null);
                clearLedgerState();

                setPending(true);
                void requestPairingDevice()
                  .then(setUsbDevice, stop)
                  .finally(() => setPending(false));
              }}
            >
              {!complete ? 'Connect' : 'Connected'}
              &nbsp;
              <LedgerIcon className='inline-block gap-1' />
            </Button>
            {complete && (
              <Button
                disabled={!complete}
                variant='gradient'
                className='mt-4'
                onClick={() => navigate(PagePath.ONBOARDING_SETUP)}
              >
                Continue
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </FadeTransition>
  );
};
