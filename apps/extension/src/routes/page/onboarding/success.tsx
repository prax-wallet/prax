import { Button } from '@repo/ui/components/ui/button';
import { SplashPage } from '@repo/ui/components/ui/splash-page';
import { useStore } from '../../../state';
import { getDefaultFrontend } from '../../../state/default-frontend';

const DEX_URL = 'https://dex.penumbra.zone';

export const OnboardingSuccess = () => {
  const defaultFrontendUrl = useStore(getDefaultFrontend);

  return (
    <SplashPage title='Account created'>
      <div className='grid gap-2 text-base font-bold'>
        <p>Connect to a Penumbra frontend to deposit, transfer, stake or swap.</p>

        <div className='flex flex-col gap-2 md:flex-row'>
          <Button
            variant='secondary'
            onClick={() => {
              window.open(defaultFrontendUrl, '_blank');
              window.close();
            }}
            className='mt-4 grow md:w-1/2'
          >
            Visit web app
          </Button>
          <Button
            variant='gradient'
            onClick={() => {
              window.open(DEX_URL, '_blank');
              window.close();
            }}
            className='mt-4 grow md:w-1/2'
          >
            Visit DEX
          </Button>
        </div>
      </div>
    </SplashPage>
  );
};
