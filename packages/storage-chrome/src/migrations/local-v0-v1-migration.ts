import { ChainRegistryClient } from '@penumbra-labs/registry';
import { fullViewingKeyFromBech32m } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { walletIdFromBech32m } from '@penumbra-zone/bech32m/penumbrawalletid';
import LocalStorage_V0 from '../versions/local-v0';
import LocalStorage_V1 from '../versions/local-v1';
import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';

export default (old: Partial<LocalStorage_V0>): Promise<[1, LocalStorage_V1]> =>
  Promise.resolve([
    1,
    {
      wallets: migrateWallets(old.wallets) ?? [],
      grpcEndpoint: validateOrReplaceEndpoint(
        old.grpcEndpoint?.value,
        old.params?.value ? AppParameters.fromJsonString(old.params.value) : undefined,
      ),
      frontendUrl: validateOrReplaceFrontend(old.frontendUrl?.value),
      passwordKeyPrint: old.passwordKeyPrint?.value ?? undefined,
      fullSyncHeight: old.fullSyncHeight?.value ?? undefined,
      knownSites: old.knownSites?.value ?? [],
      params: old.params?.value ?? undefined,
      numeraires: old.numeraires?.value ?? [],
    },
  ]);

const migrateWallets = (wallets?: LocalStorage_V0['wallets']) => {
  if (wallets == null) {
    return undefined;
  }

  switch (wallets.version) {
    case 'V1':
      return wallets.value?.map(({ fullViewingKey, id, label, custody }) => {
        const fvk = fullViewingKeyFromBech32m(fullViewingKey);
        const walletId = walletIdFromBech32m(id);
        return {
          fullViewingKey: new FullViewingKey(fvk).toJsonString(),
          id: new WalletId(walletId).toJsonString(),
          label,
          custody,
        };
      });
    case 'V2':
      return wallets.value;
    default: {
      wallets satisfies never;
      throw new TypeError(
        `Unknown legacy wallet version: ${String((wallets as { version?: unknown }).version)}`,
        { cause: wallets },
      );
    }
  }
};

// A one-time migration to suggested grpcUrls
// Context: https://github.com/prax-wallet/web/issues/166
const validateOrReplaceEndpoint = (oldEndpoint?: string, appParams?: AppParameters) => {
  // If they don't have one set, it's likely they didn't go through onboarding
  if (!oldEndpoint) {
    return undefined;
  }

  // Only replace mainnet endpoints
  if (appParams?.chainId !== 'penumbra-1') {
    return oldEndpoint;
  }

  const registryClient = new ChainRegistryClient();
  const { rpcs } = registryClient.bundled.globals();

  const suggestedEndpoints = rpcs.map(i => i.url);
  // They are already using a suggested endpoint
  if (suggestedEndpoints.includes(oldEndpoint)) {
    return oldEndpoint;
  }

  // Select a random suggested endpoint
  return suggestedEndpoints.sort(() => Math.random() - 0.5).at(0) ?? oldEndpoint;
};

// A one-time migration to suggested frontends
// Context: https://github.com/prax-wallet/web/issues/166
const validateOrReplaceFrontend = (frontendUrl?: string) => {
  // If they don't have one set, it's likely they didn't go through onboarding
  if (!frontendUrl) {
    return undefined;
  }

  const registryClient = new ChainRegistryClient();
  const { frontends } = registryClient.bundled.globals();

  const suggestedFrontends = frontends.map(i => i.url);
  // They are already using a suggested frontend
  if (suggestedFrontends.includes(frontendUrl)) {
    return frontendUrl;
  }

  // Select a random suggested frontend
  return suggestedFrontends.sort(() => Math.random() - 0.5).at(0) ?? frontendUrl;
};
