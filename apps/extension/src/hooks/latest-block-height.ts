import { useQuery } from '@tanstack/react-query';
import { sample } from 'lodash';
import { createPromiseClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { AppService, TendermintProxyService } from '@penumbra-zone/protobuf';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { useStore } from '../state';
import { networkSelector } from '../state/network';
import { localExtStorage } from '../storage/local';
import { SEED_PHRASE_ORIGIN } from '../routes/page/onboarding/set-password';

const DEFAULT_TRANSPORT_OPTS = { timeoutMs: 5000 };

export const setOnboardingValuesInStorage = async (seedPhraseOrigin: SEED_PHRASE_ORIGIN) => {
  const chainRegistryClient = new ChainRegistryClient();
  const { rpcs, frontends } = await chainRegistryClient.remote.globals();
  const randomRpc = sample(rpcs);
  const randomFrontend = sample(frontends);
  if (!randomRpc || !randomFrontend) {
    throw new Error('Registry missing RPCs or frontends');
  }

  const { appParameters } = await createPromiseClient(
    AppService,
    createGrpcWebTransport({ baseUrl: randomRpc.url }),
  ).appParameters({}, DEFAULT_TRANSPORT_OPTS);
  if (!appParameters?.chainId) {
    throw new Error('No chain id');
  }

  const { numeraires } = await chainRegistryClient.remote.get(appParameters.chainId);

  if (seedPhraseOrigin === SEED_PHRASE_ORIGIN.NEWLY_GENERATED) {
    const tendermintClient = createPromiseClient(
      TendermintProxyService,
      createGrpcWebTransport({ baseUrl: randomRpc.url }),
    );
    const result = await tendermintClient.getStatus({}, DEFAULT_TRANSPORT_OPTS);
    if (!result.syncInfo) {
      throw new Error('No syncInfo in getStatus result');
    }
    const walletBirthday = Number(result.syncInfo.latestBlockHeight);
    await localExtStorage.set('walletCreationBlockHeight', walletBirthday);
  }

  await localExtStorage.set('grpcEndpoint', randomRpc.url);
  await localExtStorage.set('frontendUrl', randomFrontend.url);
  await localExtStorage.set(
    'numeraires',
    numeraires.map(n => n.toJsonString()),
  );
};

// Fetch the block height from a specific RPC endpoint.
export const fetchBlockHeight = async (grpcEndpoint: string): Promise<number> => {
  const tendermintClient = createPromiseClient(
    TendermintProxyService,
    createGrpcWebTransport({ baseUrl: grpcEndpoint }),
  );

  const result = await tendermintClient.getStatus({});
  if (!result.syncInfo) {
    throw new Error('No syncInfo in getStatus result');
  }
  return Number(result.syncInfo.latestBlockHeight);
};

export const useLatestBlockHeight = () => {
  const { grpcEndpoint } = useStore(networkSelector);

  return useQuery({
    queryKey: ['latestBlockHeight'],
    queryFn: async () => {
      if (!grpcEndpoint) {
        return;
      }
      return await fetchBlockHeight(grpcEndpoint);
    },
    enabled: Boolean(grpcEndpoint),
  });
};
