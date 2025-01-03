import { Button } from '@repo/ui/components/ui/button';
import { SplashPage } from '@repo/ui/components/ui/splash-page';
import { useStore } from '../../../state';
import { getDefaultFrontend } from '../../../state/default-frontend';

export const OnboardingSuccess = () => {
  const defaultFrontendUrl = useStore(getDefaultFrontend);

  return (
    <SplashPage title='Account created'>
      <div className='grid gap-2 text-base font-bold'>
        <p>Connect to a Penumbra frontend to deposit, transfer, stake or swap.</p>
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
