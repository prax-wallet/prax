import { LocalStorageState, OriginRecord } from '../types';
import { MigrationFn } from '../base';
import { WalletJson } from '@penumbra-zone/types/wallet';
import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { KeyPrintJson } from '@penumbra-zone/crypto-web/encryption';
import { Stringified } from '@penumbra-zone/types/jsonified';
import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { fullViewingKeyFromBech32m } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { walletIdFromBech32m } from '@penumbra-zone/bech32m/penumbrawalletid';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { sample } from 'lodash';

export enum V0LocalStorageVersion {
  V1 = 'V1',
  V2 = 'V2',
}

interface StorageItem<T> {
  version: V0LocalStorageVersion;
  value: T;
}

// Note: previous local storage used to key a version on each individual field
export interface V0LocalStorageState {
  wallets?: StorageItem<WalletJson[]>;
  grpcEndpoint?: StorageItem<string | undefined>;
  frontendUrl?: StorageItem<string | undefined>;
  passwordKeyPrint?: StorageItem<KeyPrintJson | undefined>;
  fullSyncHeight?: StorageItem<number | undefined>;
  knownSites?: StorageItem<OriginRecord[]>;
  params?: StorageItem<Stringified<AppParameters> | undefined>;
  numeraires?: StorageItem<Stringified<AssetId>[]>;
}

// Update LocalStorageState to V1LocalStorageState if there is a version bump
export const localV0Migration: MigrationFn<V0LocalStorageState, LocalStorageState> = v0 => {
  return {
    dbVersion: 1,
    wallets:
      v0.wallets?.version === V0LocalStorageVersion.V1
        ? migrateFvkType(v0.wallets)
        : (v0.wallets?.value ?? []),
    grpcEndpoint: validateOrReplaceEndpoint(v0.grpcEndpoint?.value, v0.params?.value),
    frontendUrl: validateOrReplaceFrontend(v0.frontendUrl?.value),
    passwordKeyPrint: v0.passwordKeyPrint?.value,
    fullSyncHeight: v0.fullSyncHeight?.value,
    knownSites: v0.knownSites?.value ?? [],
    params: v0.params?.value,
    numeraires: v0.numeraires?.value ?? [],
    walletCreationBlockHeight: undefined,
    compactFrontierBlockHeight: undefined,
    backupReminderSeen: undefined,
  };
};

const migrateFvkType = (wallets: V0LocalStorageState['wallets']): WalletJson[] => {
  if (!wallets) {
    return [];
  }

  return wallets.value.map(({ fullViewingKey, id, label, custody }) => {
    const fvk = new FullViewingKey(fullViewingKeyFromBech32m(fullViewingKey));
    const walletId = new WalletId(walletIdFromBech32m(id));
    return {
      fullViewingKey: fvk.toJsonString(),
      id: walletId.toJsonString(),
      label,
      custody,
    };
  });
};

// A one-time migration to suggested grpcUrls
// Context: https://github.com/prax-wallet/web/issues/166
const validateOrReplaceEndpoint = (
  oldEndpoint: string | undefined,
  jsonStrParams: Stringified<AppParameters> | undefined,
): string | undefined => {
  // If they don't have one set, it's likely they didn't go through onboarding
  if (!oldEndpoint) {
    return oldEndpoint;
  }

  // Ensure they are connected to mainnet
  const chainId = jsonStrParams ? AppParameters.fromJsonString(jsonStrParams).chainId : undefined;

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
