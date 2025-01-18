// import { useQuery } from '@tanstack/react-query';
// import { ChainRegistryClient } from '@penumbra-labs/registry';
// import { useMemo } from 'react';

// export const useNumeraires = (chainId?: string) => {
//   const { data, isLoading, isError } = useQuery({
//     queryKey: ['registry', chainId],
//     queryFn: async () => {
//       const registryClient = new ChainRegistryClient();
//       return registryClient.remote.get(chainId!);
//     },
//     retry: 1,
//     retryDelay: 0,
//     staleTime: Infinity,
//     enabled: Boolean(chainId),
//   });

//   const numeraires = useMemo(() => {
//     if (isError) {
//       console.error(`Could not load numeraires for chainId: ${chainId}`);
//     }

//     return data?.numeraires.map(n => data.getMetadata(n)) ?? [];
//   }, [data, chainId, isError]);

//   return { numeraires, isLoading, isError };
// };
