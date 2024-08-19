import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { usePageNav } from '../../../utils/navigate';
import { PagePath } from '../paths';
import { GrpcEndpointForm } from '../../../shared/components/grpc-endpoint-form';
import { localExtStorage } from '../../../storage/local';
import { fetchBlockHeight } from '../../../hooks/full-sync-height';

export const SetGrpcEndpoint = () => {
  const navigate = usePageNav();

  const onSuccess = async (): Promise<void> => {
    const grpcEndpoint = await localExtStorage.get('grpcEndpoint');

    if (grpcEndpoint) {
      // Fetch the block height after setting the gRPC endpoint
      const walletCreationBlockHeight = await fetchBlockHeight(grpcEndpoint);

      // Store the wallet creation block height in local storage
      await localExtStorage.set('walletCreationBlockHeight', walletCreationBlockHeight!);
    }

    navigate(PagePath.SET_DEFAULT_FRONTEND);
  };

  return (
    <FadeTransition>
      <Card className='w-[400px]' gradient>
        <CardHeader>
          <CardTitle>Select your preferred RPC endpoint</CardTitle>

          <CardDescription>
            The requests you make may reveal your intentions about transactions you wish to make, so
            select an RPC node that you trust. If you&apos;re unsure which one to choose, leave this
            option set to the default.
          </CardDescription>
        </CardHeader>

        <div className='mt-6'>
          <GrpcEndpointForm submitButtonLabel='Next' isOnboarding={true} onSuccess={onSuccess} />
        </div>
      </Card>
    </FadeTransition>
  );
};
