import type * as FROM from '../versions/v1';
import type * as TO from '../versions/v2';
import { expectVersion, type Migration } from './util';

type MIGRATION = Migration<FROM.VERSION, FROM.LOCAL, TO.VERSION, TO.LOCAL>;

export default {
  version: v => expectVersion(v, 1, 2),
  transform: old => ({
    // required values should definitely have correct formats
    wallets: old.wallets ?? [],
    knownSites: old.knownSites ?? [],
    numeraires: old.numeraires ?? [],

    // optional values may contain vestigial unmigrated data, but most are safe to drop
    fullSyncHeight: typeof old.fullSyncHeight === 'number' ? old.fullSyncHeight : undefined,
    grpcEndpoint: typeof old.grpcEndpoint === 'string' ? old.grpcEndpoint : undefined,
    frontendUrl: typeof old.frontendUrl === 'string' ? old.frontendUrl : undefined,
    params: typeof old.params === 'string' ? old.params : undefined,

    // no scenario is identified in which passwordKeyPrint could have failed a
    // migration. but it should never be dropped, so is handled carefully
    passwordKeyPrint: isVestigialItem(old.passwordKeyPrint)
      ? old.passwordKeyPrint.value
      : old.passwordKeyPrint,

    // lol
    backupReminderSeen:
      typeof old.backupReminderSeen === 'boolean' ? old.backupReminderSeen : undefined,
    compactFrontierBlockHeight:
      typeof old.compactFrontierBlockHeight === 'number'
        ? old.compactFrontierBlockHeight
        : undefined,
    walletCreationBlockHeight:
      typeof old.walletCreationBlockHeight === 'number' ? old.walletCreationBlockHeight : undefined,
  }),
} satisfies MIGRATION;

const isVestigialItem = <T>(
  x?: T | { version: 'V1' | 'V2'; value?: T },
): x is { version: 'V1' | 'V2'; value?: T } =>
  typeof x === 'object' &&
  x !== null &&
  'version' in x &&
  typeof x.version === 'string' &&
  // possible legacy versions
  ['V1', 'V2'].includes(x.version);
