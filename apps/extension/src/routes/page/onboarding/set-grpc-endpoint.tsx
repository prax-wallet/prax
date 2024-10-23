import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { usePageNav } from '../../../utils/navigate';
import { PagePath } from '../paths';
import { GrpcEndpointForm } from '../../../shared/components/grpc-endpoint-form';
import { createPromiseClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { AppService, TendermintProxyService } from '@penumbra-zone/protobuf';
import { localExtStorage } from '../../../storage/local';

// Because the new seed phrase generation step queries a mainnet rpc,
// when using a non-mainnet chain id, there is a chance that generated wallet birthday is wrong.
// This logic fixes this issue after they select their rpc.
export const correctBirthdayHeightIfNeeded = async (grpcEndpoint: string) => {
  const transport = createGrpcWebTransport({ baseUrl: grpcEndpoint });
  const { appParameters } = await createPromiseClient(AppService, transport).appParameters({});

  if (!appParameters?.chainId.includes('penumbra-1')) {
    const setWalletBirthday = await localExtStorage.get('walletCreationBlockHeight');
    if (setWalletBirthday) {
      const tendermintClient = createPromiseClient(TendermintProxyService, transport);
      const { syncInfo } = await tendermintClient.getStatus({});

      // If the user's birthday is longer than the chain height, that means their mainnet birthday
      // is too long and needs to be shortened to the current block height of the non-mainnet chain
      if (syncInfo?.latestBlockHeight && Number(syncInfo.latestBlockHeight) < setWalletBirthday) {
        await localExtStorage.set('walletCreationBlockHeight', Number(syncInfo.latestBlockHeight));
      }
    }
  }
};

export const SetGrpcEndpoint = () => {
  const navigate = usePageNav();

  const onSuccess = (): void => {
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
          <GrpcEndpointForm
            submitButtonLabel='Next'
            isOnboarding={true}
            onSuccess={onSuccess}
            beforeSubmit={correctBirthdayHeightIfNeeded}
          />
        </div>
      </Card>
    </FadeTransition>
  );
};
