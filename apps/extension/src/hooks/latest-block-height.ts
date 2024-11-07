import { useQuery } from '@tanstack/react-query';
import { sample } from 'lodash';
import { createPromiseClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { AppService, TendermintProxyService } from '@penumbra-zone/protobuf';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { useStore } from '../state';
import { networkSelector } from '../state/network';
import { localExtStorage } from '../storage/local';

const DEFAULT_TRANSPORT_OPTS = { timeoutMs: 5000 };

export const setOnboardingValuesInStorage = async (
  onboardingFlow: 'importedSeedphrase' | 'newlyGeneratedSeedphrase',
) => {
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

  if (onboardingFlow === 'newlyGeneratedSeedphrase') {
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

// Utility function to fetch the block height by randomly querying one of the RPC endpoints
// from the chain registry, using a recursive callback to try another endpoint if the current
// one fails. Additionally, this implements a timeout mechanism at the request level to avoid
// hanging from stalled requests.
export const fetchBlockHeightWithFallback = async (endpoints: string[]): Promise<number> => {
  if (endpoints.length === 0) {
    throw new Error('All RPC endpoints failed to fetch the block height.');
  }

  // Randomly select an RPC endpoint from the chain registry
  const randomGrpcEndpoint = sample(endpoints);
  if (!randomGrpcEndpoint) {
    throw new Error('No RPC endpoints found.');
  }

  try {
    return await fetchBlockHeightWithTimeout(randomGrpcEndpoint);
  } catch (e) {
    // Remove the current endpoint from the list and retry with remaining endpoints
    const remainingEndpoints = endpoints.filter(endpoint => endpoint !== randomGrpcEndpoint);
    return fetchBlockHeightWithFallback(remainingEndpoints);
  }
};

// Fetch the block height from a specific RPC endpoint with a request-level timeout that superceeds
// the channel transport-level timeout to prevent hanging requests.
export const fetchBlockHeightWithTimeout = async (
  grpcEndpoint: string,
  timeoutMs = 5000,
): Promise<number> => {
  const tendermintClient = createPromiseClient(
    TendermintProxyService,
    createGrpcWebTransport({ baseUrl: grpcEndpoint }),
  );

  const result = await tendermintClient.getStatus({}, { signal: AbortSignal.timeout(timeoutMs) });
  if (!result.syncInfo) {
    throw new Error('No syncInfo in getStatus result');
  }
  return Number(result.syncInfo.latestBlockHeight);
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

// TODO: DELETE
export const useLatestBlockHeightWithFallback = () => {
  return useQuery({
    queryKey: ['latestBlockHeightWithFallback'],
    queryFn: async () => {
      const chainRegistryClient = new ChainRegistryClient();
      const { rpcs } = chainRegistryClient.bundled.globals();
      const suggestedEndpoints = rpcs.map(i => i.url);
      return await fetchBlockHeightWithFallback(suggestedEndpoints);
    },
    retry: false,
  });
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
