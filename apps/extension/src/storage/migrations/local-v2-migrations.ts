import { LocalStorageState } from '../types';
import { MigrationMap } from '../base';
import { AppParameters } from '@buf/penumbra-zone_penumbra.bufbuild_es/penumbra/core/app/v1/app_pb';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { sample } from 'lodash';

export const localV2Migrations: MigrationMap<LocalStorageState, LocalStorageState> = {
  grpcEndpoint: async (old, get) => {
    return await validateOrReplaceEndpoint(old, get);
  },
  frontendUrl: old => {
    return validateOrReplaceFrontend(old);
  },
};

// A one-time migration to suggested grpcUrls
// Context: https://github.com/prax-wallet/web/issues/166
const validateOrReplaceEndpoint = async (
  oldEndpoint: string | undefined,
  get: <K extends keyof LocalStorageState>(key: K) => Promise<LocalStorageState[K]>,
): Promise<string | undefined> => {
  // If they don't have one set, it's likely they didn't go through onboarding
  if (!oldEndpoint) {
    return oldEndpoint;
  }

  // Ensure they are connected to mainnet
  const chainId = await get('params').then(jsonParams =>
    jsonParams ? AppParameters.fromJsonString(jsonParams).chainId : undefined,
  );

  if (chainId !== 'penumbra-1') {
    return oldEndpoint;
  }

  const registryClient = new ChainRegistryClient();
  const { rpcs } = registryClient.bundled.globals();

  const suggestedEndpoints = rpcs.map(i => i.url);
  // They are already using a suggested endpoint
  if (suggestedEndpoints.includes(oldEndpoint)) {
    return oldEndpoint;
  }

  // Else give them one at random
  const randomSuggestedEndpoint = sample(suggestedEndpoints);
  if (!randomSuggestedEndpoint) {
    return oldEndpoint;
  }

  return randomSuggestedEndpoint;
};

// A one-time migration to suggested frontends
// Context: https://github.com/prax-wallet/web/issues/166
const validateOrReplaceFrontend = (frontendUrl?: string): string | undefined => {
  // If they don't have one set, it's likely they didn't go through onboarding
  if (!frontendUrl) {
    return frontendUrl;
  }

  const registryClient = new ChainRegistryClient();
  const { frontends } = registryClient.bundled.globals();

  const suggestedFrontends = frontends.map(i => i.url);
  // They are already using a suggested frontend
  if (suggestedFrontends.includes(frontendUrl)) {
    return frontendUrl;
  }

  // Else give them one at random
  const randomSuggestedFrontend = sample(suggestedFrontends);
  if (!randomSuggestedFrontend) {
    return frontendUrl;
  }

  return randomSuggestedFrontend;
};
