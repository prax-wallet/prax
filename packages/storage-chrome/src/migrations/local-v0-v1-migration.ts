import type FROM from '../versions/local-v0';
import type TO from '../versions/local-v1';
import { MAINNET, REGISTRY, expectVersion, type Migration } from './util';

import { fullViewingKeyFromBech32m } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { walletIdFromBech32m } from '@penumbra-zone/bech32m/penumbrawalletid';

import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';

import sample from 'lodash/sample';

const FROM_VERSION = 0;
const TO_VERSION = 1;

type MIGRATION = Migration<typeof FROM_VERSION, FROM, typeof TO_VERSION, TO>;

export default {
  version: v => expectVersion(v, FROM_VERSION, TO_VERSION),
  transform: old => ({
    wallets: migrateWallets(old.wallets) ?? [],
    grpcEndpoint: isMainnet(old.params)
      ? validateOrReplaceEndpoint(old.grpcEndpoint)
      : old.grpcEndpoint?.value,
    frontendUrl: validateOrReplaceFrontend(old.frontendUrl),
    passwordKeyPrint: old.passwordKeyPrint?.value,
    fullSyncHeight: old.fullSyncHeight?.value,
    knownSites: old.knownSites?.value ?? [],
    params: old.params?.value,
    numeraires: old.numeraires?.value ?? [],
  }),
} satisfies MIGRATION;

const isMainnet = (oldParams: FROM['params']) =>
  MAINNET === (oldParams?.value && AppParameters.fromJsonString(oldParams.value).chainId);

const migrateWallets = (wallets?: FROM['wallets']) => {
  if (!wallets || !Array.isArray(wallets.value) || !wallets.value.length) {
    return;
  }

  switch (wallets.version) {
    case 'V1':
      return wallets.value.map(({ fullViewingKey, id, label, custody }) => {
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
const validateOrReplaceEndpoint = (oldEndpoint: FROM['grpcEndpoint']) => {
  // If they don't have one set, it's likely they didn't go through onboarding
  if (!oldEndpoint?.value) {
    return;
  }

  const suggestedEndpoints = REGISTRY.rpcs.map(({ url }) => url);

  return (
    (suggestedEndpoints.includes(oldEndpoint.value)
      ? oldEndpoint.value
      : sample(suggestedEndpoints)) ?? oldEndpoint.value
  );
};

// A one-time migration to suggested frontends
// Context: https://github.com/prax-wallet/web/issues/166
const validateOrReplaceFrontend = (frontendUrl: FROM['frontendUrl']) => {
  // If they don't have one set, it's likely they didn't go through onboarding
  if (!frontendUrl?.value) {
    return;
  }

  const suggestedFrontends = REGISTRY.frontends.map(({ url }) => url);

  return suggestedFrontends.includes(frontendUrl.value)
    ? frontendUrl.value
    : (sample(suggestedFrontends) ?? frontendUrl.value);
};
