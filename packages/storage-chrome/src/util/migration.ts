import MIGRATIONS from '../migrations/prax-migrations';
import {
  type AnotherVersion,
  CURRENT_VERSION,
  type HistoricVersion,
  type StorageVersion,
} from '../versions/numbers';
import type { PraxStorage } from '../versions/prax-storage';

const needsMigration = (
  vs: VersionStateTuple<StorageVersion>,
): vs is VersionStateTuple<HistoricVersion> => {
  const [version] = vs;
  return Number.isInteger(version) && version >= 0 && version < CURRENT_VERSION;
};

const finishedMigration = (
  vs: VersionStateTuple<StorageVersion>,
): vs is VersionStateTuple<typeof CURRENT_VERSION> => {
  const [version] = vs;
  return version === CURRENT_VERSION;
};

type VersionStateTuple<V extends StorageVersion> = [V, PraxStorage<V>];

export const runMigrations = async (
  version: StorageVersion,
  state: Readonly<Record<'local' | 'sync', unknown>>,
): Promise<VersionStateTuple<typeof CURRENT_VERSION>> => {
  let present = [version, state] as VersionStateTuple<StorageVersion>;

  while (needsMigration(present)) {
    const [v, s] = present;
    present = [v + 1, await MIGRATIONS[v](s)] as VersionStateTuple<AnotherVersion<typeof v>>;
  }

  if (!finishedMigration(present)) {
    throw new RangeError(`No migration for version ${present[0]}`, {
      cause: MIGRATIONS,
    });
  }

  return present;
};
