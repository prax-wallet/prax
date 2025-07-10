import type * as FROM from '../versions/v1';
import type * as TO from '../versions/v2';
import { expectVersion, type Migration } from './util';

import type * as LEGACY from '../versions/v0';

type MIGRATION = Migration<FROM.VERSION, FROM.LOCAL, TO.VERSION, TO.LOCAL>;

/**
 * type describing possible states of a corrupted v0-v1 migration: fields that
 * are optional or absent in v1 may contain a vestigial versioned item from v0.
 * the item may be unwrapped to recover the correct value.
 */
type DIRTY = {
  [K in keyof LEGACY.LOCAL | keyof FROM.LOCAL]: K extends keyof LEGACY.LOCAL
    ? FROM.LOCAL[K] extends undefined
      ? LEGACY.LOCAL[K] | FROM.LOCAL[K]
      : FROM.LOCAL[K]
    : FROM.LOCAL[K];
};

type OptionalFieldNames<T> = {
  [K in keyof T as T[K] extends NonNullable<T[K]> ? never : K]-?: K;
};

const maybeUnwrapVestigial = <T extends keyof OptionalFieldNames<LEGACY.LOCAL | FROM.LOCAL>>(
  field: T,
  item: LEGACY.LOCAL[T] | FROM.LOCAL[T],
): TO.LOCAL[T] => {
  let unwrapped: FROM.LOCAL[T] | Required<LEGACY.LOCAL>[T]['value'];

  if (
    item != null &&
    typeof item === 'object' &&
    'version' in item &&
    typeof item.version === 'string'
  ) {
    // likely vestigial item
    switch (item.version) {
      case 'V1':
      case 'V2': {
        // this is a vestigial item of an expected version, so we need to unwrap it
        unwrapped = item.value;
        break;
      }
      default:
        throw new RangeError(`Unknown vestigial field version: ${String(item.version)}`);
    }
  } else {
    // not a vestigial item, so we can return the item directly
    unwrapped = item as FROM.LOCAL[T];
  }

  switch (field) {
    case 'passwordKeyPrint':
    case 'fullSyncHeight':
    case 'grpcEndpoint':
    case 'frontendUrl':
    case 'params':
      // these should never be `null`, so coalesce to `undefined`
      return (unwrapped ?? undefined) as TO.LOCAL[T];

    default:
      field satisfies never;
      console.warn(`Unexpected vestigial field: ${String(field)}`, item);
      return undefined;
  }
};

export default {
  version: v => expectVersion(v, 1, 2),
  transform: (old: Partial<DIRTY>) => ({
    // required fields won't be vestigial
    wallets: old.wallets ?? [],
    knownSites: old.knownSites ?? [],
    numeraires: old.numeraires ?? [],

    // optional fields may be vestigial
    fullSyncHeight: maybeUnwrapVestigial('fullSyncHeight', old.fullSyncHeight),
    grpcEndpoint: maybeUnwrapVestigial('grpcEndpoint', old.grpcEndpoint),
    frontendUrl: maybeUnwrapVestigial('frontendUrl', old.frontendUrl),
    params: maybeUnwrapVestigial('params', old.params),

    // unlikely to suffer vestigial data, but technically possible
    passwordKeyPrint: maybeUnwrapVestigial('passwordKeyPrint', old.passwordKeyPrint),
  }),
} satisfies MIGRATION;
