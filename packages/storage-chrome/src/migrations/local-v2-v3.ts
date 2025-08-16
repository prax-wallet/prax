import type * as FROM from '../versions/v2';
import type * as TO from '../versions/v3';
import { expectVersion, type Migration } from './util';

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
    wallets: wallets ?? [],

    backupReminderSeen,
    compactFrontierBlockHeight,
    frontendUrl,
    fullSyncHeight,
    grpcEndpoint,
    params,
    passwordKeyPrint,
    walletCreationBlockHeight,
  }),
} satisfies MIGRATION;
