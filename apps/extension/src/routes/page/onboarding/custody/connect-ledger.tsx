import { bech32mWalletId } from '@penumbra-zone/bech32m/penumbrawalletid';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { getWalletId } from '@penumbra-zone/wasm/keys';
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
import { LineWave } from 'react-loader-spinner';
import { useStore } from '../../../../state';
import { selectOnboardingLedger } from '../../../../state/onboarding/connect-ledger';
import { usePageNav } from '../../../../utils/navigate';
import { PagePath } from '../../paths';
import { LedgerIcon } from './ledger-icon';

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
    fullViewingKey,
    getFullViewingKey,
    deviceInfo,
    getDeviceInfo,
    clearLedgerState,
  } = useStore(selectOnboardingLedger);

  const stop = useCallback(
    (cause: unknown) => {
      setComplete(false);
      setPending(false);
      setLedgerApp(null);
      setUsbDevice(null);
      clearLedgerState();
      console.error(cause);
      setFailure(
        cause instanceof Error ? cause : new Error(`Unknown failure: ${String(cause)}`, { cause }),
      );
    },
    [clearLedgerState, setFailure, setPending, setUsbDevice, setLedgerApp],
  );

  useEffect(() => {
    if (pending || complete || failure) {
      return;
    }

    if (usbDevice) {
      setPending(true);

      let step: undefined | Promise<void> = undefined;

      if (!ledgerApp) {
        step = connectLedgerApp(usbDevice).then(setLedgerApp);
      } else if (!deviceInfo) {
        step = getDeviceInfo(ledgerApp);
      } else if (!fullViewingKey) {
        step = getFullViewingKey(ledgerApp).then(() => setComplete(true));
      }

      void Promise.resolve(step)
        .catch(stop)
        .finally(() => setPending(false));
    }
  }, [ledgerApp, fullViewingKey, pending, getFullViewingKey, usbDevice]);

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
            {ledgerApp && <div>Obtaining device info...</div>}
            {deviceInfo && <div>Obtaining viewing key...</div>}
            {fullViewingKey && (
              <div className='p-12'>
                <div className='font-headline'>Success!</div>
                <div
                  className={cn('font-mono text-muted-foreground', 'w-1/2', 'break-all', 'mx-auto')}
                >
                  {bech32mWalletId(getWalletId(new FullViewingKey(fullViewingKey)))}
                </div>
              </div>
            )}
            {failure && <div className='text-rust'>{String(failure)}</div>}
          </div>
          <div className='flex flex-row justify-center gap-4'>
            {!complete && (
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
                {!pending ? 'Connect' : 'Pending...'}
                &nbsp;
                <LedgerIcon className='inline-block gap-1' />
              </Button>
            )}
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
