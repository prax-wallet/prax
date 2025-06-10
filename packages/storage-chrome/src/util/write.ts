import { CURRENT_VERSION } from '../versions/numbers';
import type { PraxStorage } from '../versions/prax-storage';

type MigratedRecord<A extends 'local' | 'sync'> = PraxStorage<typeof CURRENT_VERSION>[A] & {
  dbVersion: typeof CURRENT_VERSION;
};

type WritableArea<A extends 'local' | 'sync'> = Pick<chrome.storage.StorageArea, 'clear'> & {
  set: (i: MigratedRecord<A>) => Promise<void>;
};

const withWrite = (
  cb: (areas: { local: WritableArea<'local'>; sync: WritableArea<'sync'> }) => Promise<void>,
) => cb(chrome.storage);

export const write = {
  commitMigration: (
    backup: { local: Readonly<unknown> },
    updatedState: { local: MigratedRecord<'local'> },
  ) =>
    withWrite(async ({ local }) => {
      try {
        await local.clear();
        await local.set(updatedState.local);
      } catch (e) {
        // restore the backup copy if the migration fails
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument -- backup may be anything
        await local.set(backup.local as any);
        throw e;
      }
    }),
};
