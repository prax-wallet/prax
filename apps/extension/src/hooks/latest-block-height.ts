import { useQuery } from '@tanstack/react-query';
import { createPromiseClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { TendermintProxyService } from '@penumbra-zone/protobuf';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { useStore } from '../state';
import { networkSelector } from '../state/network';

const fetchRemoteLatestBlockHeight = async (rpcUrls: string[], timeoutMs = 5000) => {
  for (const baseUrl of rpcUrls) {
    const tendermintClient = createPromiseClient(
      TendermintProxyService,
      createGrpcWebTransport({ baseUrl }),
    );

    const latestBlockHeight = await tendermintClient
      .getStatus({}, { signal: AbortSignal.timeout(timeoutMs) })
      .then(
        status => status.syncInfo?.latestBlockHeight,
        () => undefined,
      );

    if (latestBlockHeight) {
      return latestBlockHeight;
    }
  }

  throw new Error('Remote endpoint(s) failed to return block height.');
};

export const useRemoteLatestBlockHeightWithFallback = () => {
  const { grpcEndpoint } = useStore(networkSelector);

  return useQuery({
    queryKey: ['latestBlockHeightWithFallback'],
    queryFn: () => {
      const registryRpcUrls = new ChainRegistryClient().bundled
        .globals()
        .rpcs.map(({ url }) => url);

      // random order fallbacks
      const fallbackUrls = registryRpcUrls.sort(() => Math.random() - 0.5);

      // but try any deliberately selected endpoint first
      const rpcUrls = grpcEndpoint
        ? [grpcEndpoint, ...fallbackUrls.filter(url => url !== grpcEndpoint)]
        : fallbackUrls;

      return fetchRemoteLatestBlockHeight(rpcUrls);
    },
    retry: false,
  });
};

export const useRemoteLatestBlockHeight = () => {
  const { grpcEndpoint } = useStore(networkSelector);

  return useQuery({
    queryKey: ['latestBlockHeight'],
    queryFn: () => (grpcEndpoint ? fetchRemoteLatestBlockHeight([grpcEndpoint]) : undefined),
    enabled: Boolean(grpcEndpoint),
  });
};
