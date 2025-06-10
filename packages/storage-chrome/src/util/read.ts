import { withMigrationLock } from './storage-lock';
import { CURRENT_VERSION, StorageVersion } from '../versions/numbers';

type ReadableArea = Pick<chrome.storage.StorageArea, 'get' | 'getBytesInUse'>;

export const withRead = <T>(
  cb: (areas: { local: ReadableArea; sync: ReadableArea }) => Promise<T>,
): Promise<T> => cb(chrome.storage);

export const read = {
  confirmMigration: () =>
    withRead(
      ({ local }): Promise<void> =>
        withMigrationLock({ mode: 'shared', ifAvailable: false }, async () => {
          console.debug('Migration lock released. Confirming version.');
          const storedVersion = getVersion(await local.get('dbVersion'));
          if (storedVersion !== CURRENT_VERSION) {
            throw RangeError(`Version ${storedVersion} is not expected ${CURRENT_VERSION}.`);
          }
        }),
    ),
  stateSnapshot: () =>
    withRead(async ({ local }) => {
      const entireState = await local.get(null);
      const version = getVersion(entireState);
      return { local: [version, entireState], sync: undefined } as const;
    }),
  getBytesInUse: () =>
    withRead(async ({ local, sync }) => ({
      local: await local.getBytesInUse(null),
      sync: await sync.getBytesInUse(null),
    })),
} as const;

const getVersion = ({ dbVersion }: Partial<Record<'dbVersion', unknown>>): StorageVersion => {
  if (dbVersion == null) {
    return 0;
  } else if (isStorageVersion(dbVersion)) {
    return dbVersion;
  } else {
    throw new TypeError(
      `Migration failed: Unknown storage version ${String(dbVersion as unknown)}`,
      { cause: dbVersion },
    );
  }
};

const isStorageVersion = (v?: unknown): v is StorageVersion =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= CURRENT_VERSION;
