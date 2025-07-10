import type * as FROM from '../versions/v0';
import type * as TO from '../versions/v1';
import { MAINNET, REGISTRY, expectVersion, type Migration } from './util';

import { fullViewingKeyFromBech32m } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { walletIdFromBech32m } from '@penumbra-zone/bech32m/penumbrawalletid';
import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import sample from 'lodash/sample';

type MIGRATION = Migration<FROM.VERSION, FROM.LOCAL, TO.VERSION, TO.LOCAL>;

export default {
  version: v => expectVersion(v, 0, 1),
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

const isMainnet = (oldParams: FROM.LOCAL['params']) =>
  MAINNET === (oldParams?.value && AppParameters.fromJsonString(oldParams.value).chainId);

const migrateWallets = (wallets?: FROM.LOCAL['wallets']) => {
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
const validateOrReplaceEndpoint = (oldEndpoint: FROM.LOCAL['grpcEndpoint']) => {
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
const validateOrReplaceFrontend = (frontendUrl: FROM.LOCAL['frontendUrl']) => {
  // If they don't have one set, it's likely they didn't go through onboarding
  if (!frontendUrl?.value) {
    return;
  }

  const suggestedFrontends = REGISTRY.frontends.map(({ url }) => url);

  return suggestedFrontends.includes(frontendUrl.value)
    ? frontendUrl.value
    : (sample(suggestedFrontends) ?? frontendUrl.value);
};
