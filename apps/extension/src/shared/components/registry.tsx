import { useQuery } from '@tanstack/react-query';
import { ChainRegistryClient } from '@penumbra-labs/registry';

export const useRegistry = () => {
  return useQuery({
    queryKey: ['registryGlobals'],
    queryFn: () => new ChainRegistryClient().remote.globals(),
    staleTime: Infinity,
  });
};
