import { Metadata } from '@buf/penumbra-zone_penumbra.bufbuild_es/penumbra/core/asset/v1/asset_pb';
import { ChainRegistryClient } from '@penumbra-labs/registry';

export const getNumeraireFromRegistry = (chainId?: string): Metadata[] => {
  if (!chainId) return [];
  try {
    const registryClient = new ChainRegistryClient();
    const registry = registryClient.get(chainId);
    return registry.numeraires.map(n => registry.getMetadata(n));
  } catch (error) {
    console.error('Registry numeraires is not available', error);
    return [];
  }
};
