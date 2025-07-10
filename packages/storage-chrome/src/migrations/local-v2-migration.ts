import type * as FROM from '../versions/v1';
import type * as TO from '../versions/v2';
import { expectVersion, type Migration } from './util';

import type * as LEGACY from '../versions/v0';

type MIGRATION = Migration<FROM.VERSION, FROM.LOCAL, TO.VERSION, TO.LOCAL>;

const isVestigialItem = (
  field: string,
  dirtyState: DIRTY,
): field is keyof OptionalFieldNames<LEGACY.LOCAL> => {
  const item = dirtyState[field as keyof DIRTY];
  if (
    item != null &&
    typeof item === 'object' &&
    'version' in item &&
    typeof item.version === 'string'
  ) {
    const itemVersion = item.version;
    if (['V1', 'V2'].includes(itemVersion)) {
      return true;
    } else if (/^V\d+$/.test(itemVersion)) {
      throw new RangeError(`Unknown vestigial field version: ${itemVersion}`);
    }
  }
  return false;
};

const unwrapVestigialItem = <T extends keyof LEGACY.LOCAL>(
  field: T,
  legacyState: Partial<LEGACY.LOCAL>,
): NonNullable<LEGACY.LOCAL[T]>['value'] | undefined =>
  // none of these should be `null`, so coalesce to `undefined`
  legacyState[field]?.value ?? undefined;

export default {
  version: v => expectVersion(v, 1, 2),
  transform: (dirty: DIRTY) => {
    const clean: TO.LOCAL = {
      // copy state
      ...(dirty as Partial<FROM.LOCAL>),
      // ensure that required fields are present
      wallets: (dirty as Partial<FROM.LOCAL>).wallets ?? [],
      knownSites: (dirty as Partial<FROM.LOCAL>).knownSites ?? [],
      numeraires: (dirty as Partial<FROM.LOCAL>).numeraires ?? [],
    };

    const vestigialFields = Object.keys(dirty).filter(field => isVestigialItem(field, dirty));

    for (const field of vestigialFields) {
      // annoyingly, these must be separated by type, even though each
      // expression is identical
      switch (field) {
        case 'passwordKeyPrint':
          clean[field] = unwrapVestigialItem(field, dirty as Partial<LEGACY.LOCAL>);
          break;
        case 'fullSyncHeight':
          clean[field] = unwrapVestigialItem(field, dirty as Partial<LEGACY.LOCAL>);
          break;
        case 'grpcEndpoint':
        case 'frontendUrl':
        case 'params':
          clean[field] = unwrapVestigialItem(field, dirty as Partial<LEGACY.LOCAL>);
          break;
        default:
          console.warn(`Eliminating unknown vestigial field: ${String(field)}`);
          clean[field] = undefined as never;
      }
    }

    return clean;
  },
} satisfies MIGRATION;

type OptionalOf<F extends keyof O, O> = O[F] extends NonNullable<O[F]> ? never : F;

type OptionalFieldNames<T> = {
  [K in keyof T as OptionalOf<K, T>]-?: NonNullable<K>;
};

type DIRTY = Partial<{
  [K in keyof LEGACY.LOCAL | keyof FROM.LOCAL]: K extends keyof LEGACY.LOCAL
    ? FROM.LOCAL[K] extends undefined
      ? LEGACY.LOCAL[K] | FROM.LOCAL[K]
      : FROM.LOCAL[K]
    : FROM.LOCAL[K];
}>;
