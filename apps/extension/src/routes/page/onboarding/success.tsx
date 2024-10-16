import { Button } from '@repo/ui/components/ui/button';
import { SplashPage } from '@repo/ui/components/ui/splash-page';
import { useStore } from '../../../state';
import { getDefaultFrontend } from '../../../state/default-frontend';
import { localExtStorage } from '../../../storage/local';
// import { useEffect } from 'react';

export const OnboardingSuccess = () => {
  const defaultFrontendUrl = useStore(getDefaultFrontend);

  // Conditional: for beta-testing purposes, set the wallet block height to zero for non-mainnet chain id's.
  void (async () => {
    const storedParams = await localExtStorage.get('params');
    if (storedParams) {
      const { chainId } = JSON.parse(storedParams as string);
      if (chainId && !chainId.includes('penumbra-1')) {
        await localExtStorage.set('walletCreationBlockHeight', 0);
      }
    }
  })();

  return (
    <SplashPage title='Account created'>
      <div className='grid gap-2 text-base font-bold'>
        <p>You are all set!</p>
        <p>
          Use your account to transact, stake, swap or market make. All of it is shielded and
          private.
        </p>
        <Button
          variant='gradient'
          onClick={() => {
            window.open(defaultFrontendUrl, '_blank');
            window.close();
          }}
          className='mt-4'
        >
          Visit web app
        </Button>
      </div>
    </SplashPage>
  );
};
