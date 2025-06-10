import { ChainRegistryClient } from '@penumbra-labs/registry';
import { fullViewingKeyFromBech32m } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { walletIdFromBech32m } from '@penumbra-zone/bech32m/penumbrawalletid';
import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';

import type * as From from '../versions/v0';
import type * as To from '../versions/v1';

export function local(old: From.local): To.local {
  return {
    wallets: validateOrReplaceWallets(old.wallets),
    grpcEndpoint: validateOrReplaceEndpoint(old.grpcEndpoint, old.params),
    frontendUrl: validateOrReplaceFrontend(old.frontendUrl),
    passwordKeyPrint: old.passwordKeyPrint?.value,
    fullSyncHeight: old.fullSyncHeight?.value,
    knownSites: old.knownSites?.value ?? [],
    params: old.params?.value,
    numeraires: old.numeraires?.value ?? [],
    walletCreationBlockHeight: undefined,
    compactFrontierBlockHeight: undefined,
    backupReminderSeen: undefined,
  };
}

const convertLegacyWallet = ({
  fullViewingKey,
  id,
  label,
  custody,
}: (From.local['wallets'] & { version: 'V1' })['value'][number]) => ({
  label,
  custody,
  fullViewingKey: new FullViewingKey(fullViewingKeyFromBech32m(fullViewingKey)).toJsonString(),
  id: new WalletId(walletIdFromBech32m(id)).toJsonString(),
});

const validateOrReplaceWallets = (wallets?: From.local['wallets']): To.local['wallets'] => {
  if (!wallets) {
    return [];
  }
  switch (wallets.version) {
    case 'V1':
      return wallets.value.map(convertLegacyWallet);
    case 'V2':
      return wallets.value;
    default:
      wallets satisfies never;
      if ('value' in wallets && (wallets as Record<string, unknown>)['value'] == null) {
        // appears to contain a null value
        return [];
      } else {
        throw new TypeError(
          `Unknown legacy wallet item version ${String((wallets as { version: unknown }).version)}`,
          { cause: wallets },
        );
      }
  }
};

const validateOrReplaceEndpoint = (
  oldGrpcEndppoint: From.local['grpcEndpoint'],
  oldParams: From.local['params'],
): To.local['grpcEndpoint'] => {
  if (!oldGrpcEndppoint?.value) {
    return undefined;
  }
  const grpcEndpoint = oldGrpcEndppoint.value;

  // Ensure they are connected to mainnet
  const chainId = oldParams?.value
    ? AppParameters.fromJsonString(oldParams.value).chainId
    : undefined;

  if (chainId !== 'penumbra-1') {
    return grpcEndpoint;
  }

  const registryClient = new ChainRegistryClient();
  const { rpcs } = registryClient.bundled.globals();

  const suggestedEndpoints = rpcs.map(i => i.url);
  // They are already using a suggested endpoint
  if (suggestedEndpoints.includes(grpcEndpoint)) {
    return grpcEndpoint;
  }

  // Else give them one at random
  const randomSuggestedEndpoint = sample(suggestedEndpoints);
  if (!randomSuggestedEndpoint) {
    return grpcEndpoint;
  }

  return randomSuggestedEndpoint;
};

const validateOrReplaceFrontend = (
  oldFrontend?: From.local['frontendUrl'],
): To.local['frontendUrl'] => {
  if (!oldFrontend?.value) {
    return undefined;
  }
  const frontendUrl = oldFrontend.value;

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

const sample = <T>(arr: T[]): T | undefined => arr.sort(() => Math.random() - 0.5).at(0);
