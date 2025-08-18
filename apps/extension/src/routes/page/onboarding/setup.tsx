import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { cn } from '@repo/ui/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import { LineWave } from 'react-loader-spinner';
import { useStore } from '../../../state';
import { onboardingSetupSelector } from '../../../state/onboarding';
import { usePageNav } from '../../../utils/navigate';
import { PagePath } from '../paths';

export const OnboardingSetup = () => {
  const navigate = usePageNav();
  const [error, setError] = useState<Error | null>(null);

  const { onboardFrontendUrl, onboardGrpcEndpoint, onboardBlockHeights, onboardNumeraires } =
    useStore(onboardingSetupSelector);

  const completeSetup = useCallback(async () => {
    const chainRegistryClient = new ChainRegistryClient();
    await onboardFrontendUrl({ chainRegistryClient });
    const { grpcEndpoint } = await onboardGrpcEndpoint({ chainRegistryClient });
    const transport = grpcEndpoint ? createGrpcWebTransport({ baseUrl: grpcEndpoint }) : undefined;
    await onboardBlockHeights({ chainRegistryClient, transport });
    await onboardNumeraires({ chainRegistryClient, transport });
  }, [onboardFrontendUrl, onboardGrpcEndpoint, onboardBlockHeights, onboardNumeraires]);

  useEffect(
    () =>
      void completeSetup().then(
        () => navigate(PagePath.SET_PASSWORD),
        cause => setError(cause instanceof Error ? cause : new Error('Setup failed', { cause })),
      ),
    [completeSetup, navigate, setError],
  );

  return (
    <FadeTransition>
      <Card className='w-full max-w-md mx-auto'>
        <CardHeader>
          <CardTitle>Setting up wallet</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col items-center justify-center py-8 space-y-4'>
          <LineWave
            visible={true}
            height='60'
            width='60'
            color='#FFFFFF'
            wrapperClass={cn('mt-[-17.5px] mr-[-21px]', error && 'animate-none')}
          />
          {error && <p className='text-sm text-muted-foreground'>{error.message}</p>}
        </CardContent>
      </Card>
    </FadeTransition>
  );
};
