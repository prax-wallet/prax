import { local as localDefaults } from '../defaults';
import { CURRENT_VERSION } from '../versions/numbers';
import { runMigrations } from './migration';
import { MigrationError } from './migration-error';
import { read } from './read';
import { withMigrationLock } from './storage-lock';
import { write } from './write';

/** Default export is a migration promise. Import begins the migration. */
export default withMigrationLock({ mode: 'exclusive', ifAvailable: true }, async lock => {
  // @ts-expect-error -- locally shadow the chrome global
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- locally shadow the chrome global
  const chrome = undefined;

  if (!lock) {
    // something else is holding the lock. it should eventually release, and
    // then we can confirm the version.
    await read.confirmMigration();
    return;
  }

  const { local: bytesInUse } = await read.getBytesInUse();
  if (!bytesInUse) {
    // storage is empty.
    await write.commitMigration(
      { local: {} },
      { local: { ...localDefaults, dbVersion: CURRENT_VERSION } },
    );
    return;
  }

  const {
    local: [version, state],
  } = await read.stateSnapshot();
  if (version === CURRENT_VERSION) {
    // storage is up to date.
    return;
  }

  // perform the state transformation in-memory
  const updatedState = await runMigrations(version, { local: state, sync: undefined });

  // commit the migration to storage
  await write.commitMigration(
    { local: state },
    {
      local: {
        ...localDefaults,
        ...updatedState,
        dbVersion: CURRENT_VERSION,
      },
    },
  );

  // migration complete
}).catch((e: unknown) => {
  if (e instanceof MigrationError) {
    throw e;
  } else if (e instanceof Error) {
    throw new MigrationError(e.message, { cause: e });
  } else {
    throw new MigrationError('Migration failed', { cause: e });
  }
});
