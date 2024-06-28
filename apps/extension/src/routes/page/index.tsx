import { redirect } from 'react-router-dom';
import { PagePath } from './paths';
import { SplashPage } from '@repo/ui/components/ui/splash-page';
import { Button } from '@repo/ui/components/ui/button';
import { localExtStorage } from '../../storage/local';
import { useStore } from '../../state';
import { getDefaultFrontend } from '../../state/default-frontend';

// Because Zustand initializes default empty (prior to persisted storage synced),
// We need to manually check storage for accounts in the loader.
// Will redirect to onboarding if necessary.
export const pageIndexLoader = async () => {
  const wallets = await localExtStorage.get('wallets');
  const grpcEndpoint = await localExtStorage.get('grpcEndpoint');
  const frontendUrl = await localExtStorage.get('frontendUrl');

  if (!wallets.length) return redirect(PagePath.WELCOME);
  if (!grpcEndpoint) return redirect(PagePath.SET_GRPC_ENDPOINT);
  if (!frontendUrl) return redirect(PagePath.SET_DEFAULT_FRONTEND);

  return null;
};

export const PageIndex = () => {
  const defaultFrontendUrl = useStore(getDefaultFrontend);

  return (
    <SplashPage
      title='Successful login'
      description='Use your account to transact, stake, swap or market make.'
    >
      <Button
        variant='gradient'
        className='w-full'
        onClick={() => {
          window.open(defaultFrontendUrl, '_blank');
          window.close();
        }}
      >
        Visit testnet web app
      </Button>
    </SplashPage>
  );
};
