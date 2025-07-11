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

    // passwordKeyPrint is unlikely to have failed a migration, but it should
    // never be dropped, so is handled carefully
    passwordKeyPrint: migratePasswordKeyPrint(old.passwordKeyPrint),
  }),
} satisfies MIGRATION;

const migratePasswordKeyPrint = (x: unknown): { hash: string; salt: string } | undefined => {
  // this is very unlikely, but theoretically possible
  const unwrapped = isVestigialItem(x) ? x.value : x;

  if (unwrapped == null) {
    // no password is set
    return undefined;
  }

  if (isKeyPrintJson(unwrapped)) {
    // password is set
    return unwrapped;
  }

  // this should never happen. there's no safe way to recover
  console.error('Invalid passwordKeyPrint', x);
  throw new TypeError(`Invalid passwordKeyPrint type ${typeof x}`, { cause: x });
};

const isKeyPrintJson = (x: unknown): x is { hash: string; salt: string } =>
  typeof x === 'object' && x !== null && 'hash' in x && 'salt' in x;

const isVestigialItem = (x: unknown): x is { version: 'V1' | 'V2'; value?: unknown } =>
  typeof x === 'object' &&
  x !== null &&
  'version' in x &&
  typeof x.version === 'string' &&
  ['V1', 'V2'].includes(x.version);
