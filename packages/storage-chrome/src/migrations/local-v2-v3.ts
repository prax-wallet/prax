import type * as FROM from '../versions/v2';
import type * as TO from '../versions/v3';
import { expectVersion, type JsonMessage, type Migration } from './util';

import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';

type MIGRATION = Migration<FROM.VERSION, FROM.LOCAL, TO.VERSION, TO.LOCAL>;

export default {
  version: v => expectVersion(v, 2, 3),
  transform: ({
    knownSites,
    numeraires,
    wallets,

    backupReminderSeen,
    compactFrontierBlockHeight,
    frontendUrl,
    fullSyncHeight,
    grpcEndpoint,
    params,
    passwordKeyPrint,
    walletCreationBlockHeight,
  }) => ({
    knownSites: knownSites ?? [],
    numeraires: numeraires ?? [],
    wallets: (wallets ?? []).map(({ label, fullViewingKey, custody }) => ({
      label,
      fullViewingKey: FullViewingKey.fromJsonString(
        fullViewingKey,
      ).toJson() as JsonMessage<FullViewingKey>,
      custody,
    })),

    backupReminderSeen,
    compactFrontierBlockHeight,
    frontendUrl,
    fullSyncHeight,
    grpcEndpoint,
    params: params
      ? (AppParameters.fromJsonString(params).toJson() as JsonMessage<AppParameters>)
      : undefined,
    passwordKeyPrint,
    walletCreationBlockHeight,
  }),
} satisfies MIGRATION;
