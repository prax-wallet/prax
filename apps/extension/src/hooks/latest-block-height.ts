import { useQuery } from '@tanstack/react-query';
import { sample } from 'lodash';
import { createClient, Transport } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { TendermintProxyService } from '@penumbra-zone/protobuf';
import { useStore } from '../state';
import { networkSelector } from '../state/network';
import { DEFAULT_GRPC } from '../routes/page/onboarding/constants';

// Utility function to fetch the block height by randomly querying one of the RPC endpoints
// from the chain registry (if default is unavailable), using a recursive callback to try
// another endpoint for liveness if the current one fails. Additionally, this implements a
// timeout mechanism at the request level to avoid hanging from stalled requests.
export const fetchBlockHeightWithFallback = async (
  endpoints: string[],
  transport?: Transport, // Deps injection mostly for unit tests
): Promise<{ blockHeight: number; rpc: string }> => {
  if (endpoints.length === 0) {
    throw new Error('All RPC endpoints failed to fetch the block height.');
  }

  // If default RPC is not found, randomly sample an RPC endpoint from the chain registry.
  const selectedGrpc = endpoints.includes(DEFAULT_GRPC) ? DEFAULT_GRPC : sample(endpoints);

  if (!selectedGrpc) {
    throw new Error('No RPC endpoints found.');
  }

  try {
    const blockHeight = await fetchBlockHeightWithTimeout(selectedGrpc, transport);
    return { blockHeight, rpc: selectedGrpc };
  } catch (e) {
    // Remove the current endpoint from the list and retry with remaining endpoints
    const remainingEndpoints = endpoints.filter(endpoint => endpoint !== selectedGrpc);
    return fetchBlockHeightWithFallback(remainingEndpoints, transport);
  }
};

// Fetch the block height from a specific RPC endpoint with a request-level timeout that supersedes
// the channel transport-level timeout to prevent hanging requests.
export const fetchBlockHeightWithTimeout = async (
  grpcEndpoint: string,
  transport = createGrpcWebTransport({ baseUrl: grpcEndpoint }),
  timeoutMs = 3000,
): Promise<number> => {
  const tendermintClient = createClient(TendermintProxyService, transport);

  const result = await tendermintClient.getStatus({}, { signal: AbortSignal.timeout(timeoutMs) });
  if (!result.syncInfo) {
    throw new Error('No syncInfo in getStatus result');
  }
  return Number(result.syncInfo.latestBlockHeight);
};

// Fetch the block height from a specific RPC endpoint.
export const fetchBlockHeight = async (grpcEndpoint: string): Promise<number> => {
  const tendermintClient = createClient(
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
