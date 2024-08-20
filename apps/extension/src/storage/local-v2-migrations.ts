import { fullViewingKeyFromBech32m } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { walletIdFromBech32m } from '@penumbra-zone/bech32m/penumbrawalletid';
import { LocalStorageState, LocalStorageVersion } from './types';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { localExtStorage } from './local';
import { AppParameters } from '@buf/penumbra-zone_penumbra.bufbuild_es/penumbra/core/app/v1/app_pb';
import { sample } from 'lodash';

/*
 * Important: Our chrome storage migrations require you to write them from each previous
 *            version to the latest one. For example, if there are versions 1, 2, & 3, you need
 *            to write migrations for all changed fields (1 -> 3, and 2 -> 3).
 *
 * Given migrations happen at a key level (and not whole db level), this is a data structure
 * that is likely worth revisiting later to improve.
 */
interface LocalMigration {
  wallets: {
    [LocalStorageVersion.V1]: (old: LocalStorageState['wallets']) => LocalStorageState['wallets'];
  };
  grpcEndpoint: {
    [LocalStorageVersion.V1]: (
      old: LocalStorageState['grpcEndpoint'],
    ) => Promise<LocalStorageState['grpcEndpoint']>;
    [LocalStorageVersion.V2]: (
      old: LocalStorageState['grpcEndpoint'],
    ) => Promise<LocalStorageState['grpcEndpoint']>;
  };
  frontendUrl: {
    [LocalStorageVersion.V1]: (
      old: LocalStorageState['frontendUrl'],
    ) => LocalStorageState['frontendUrl'];
    [LocalStorageVersion.V2]: (
      old: LocalStorageState['frontendUrl'],
    ) => LocalStorageState['frontendUrl'];
  };
}

export const localMigrations: LocalMigration = {
  wallets: {
    // Previously was stored as a bech32m string instead of a json encoded string
    [LocalStorageVersion.V1]: old =>
      old.map(({ fullViewingKey, id, label, custody }) => {
        const fvk = new FullViewingKey(fullViewingKeyFromBech32m(fullViewingKey));
        const walletId = new WalletId(walletIdFromBech32m(id));
        return {
          fullViewingKey: fvk.toJsonString(),
          id: walletId.toJsonString(),
          label,
          custody,
        };
      }),
  },
  grpcEndpoint: {
    [LocalStorageVersion.V1]: async old => {
      return await validateOrReplaceEndpoint(old);
    },
    [LocalStorageVersion.V2]: async old => {
      return await validateOrReplaceEndpoint(old);
    },
  },
  frontendUrl: {
    [LocalStorageVersion.V1]: old => {
      return validateOrReplaceFrontend(old);
    },
    [LocalStorageVersion.V2]: old => {
      return validateOrReplaceFrontend(old);
    },
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
