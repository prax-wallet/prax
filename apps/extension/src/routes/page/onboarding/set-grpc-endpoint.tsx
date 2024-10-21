import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { usePageNav } from '../../../utils/navigate';
import { PagePath } from '../paths';
import { GrpcEndpointForm } from '../../../shared/components/grpc-endpoint-form';
import { localExtStorage } from '../../../storage/local';
import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';

export const SetGrpcEndpoint = () => {
  const navigate = usePageNav();

  // For beta testing: set the wallet block height to zero for non-mainnet chain IDs.
  // This logic only runs after the user selects their rpc endpoint.
  const onSuccess = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const storedParams = await localExtStorage.get('params');
    if (storedParams) {
      const parsedParams = JSON.parse(storedParams) as AppParameters;
      if (!parsedParams.chainId.includes('penumbra-1')) {
        await localExtStorage.set('walletCreationBlockHeight', 0);
      }
    }

    // Navigate to the next page after logic completes
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
