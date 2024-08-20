import { LocalStorageState } from '../types';
import { MigrationMap } from '../base';
import { localExtStorage } from '../local';
import { AppParameters } from '@buf/penumbra-zone_penumbra.bufbuild_es/penumbra/core/app/v1/app_pb';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { sample } from 'lodash';

export const localV2Migrations: MigrationMap<LocalStorageState, LocalStorageState> = {
  grpcEndpoint: async old => {
    return await validateOrReplaceEndpoint(old);
  },
  frontendUrl: old => {
    return validateOrReplaceFrontend(old);
  },
};

const isConnectedToMainnet = async (): Promise<boolean> => {
  const chainId = await localExtStorage
    .get('params')
    .then(jsonParams =>
      jsonParams ? AppParameters.fromJsonString(jsonParams).chainId : undefined,
    );

  // Ensure they are connected to mainnet
  return chainId === 'penumbra-1';
};

// A one-time migration to suggested grpcUrls
// Context: https://github.com/prax-wallet/web/issues/166
const validateOrReplaceEndpoint = async (oldEndpoint?: string): Promise<string | undefined> => {
  // If they don't have one set, it's likely they didn't go through onboarding
  if (!oldEndpoint) {
    return oldEndpoint;
  }

  const connectedToMainnet = await isConnectedToMainnet();
  if (!connectedToMainnet) {
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
