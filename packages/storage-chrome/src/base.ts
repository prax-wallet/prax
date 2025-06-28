import { ChromeStorageListener } from './listener';
import { Migration } from './migrations/type';
import { VERSION_FIELD } from './version-field';

export type ExtensionStorageDefaults<T> = {
  [K in keyof T]: undefined extends T[K] ? never : Required<T>[K] extends T[K] ? T[K] : never;
};

export type ExtensionStorageMigrations<CV, MV extends number = number> = CV extends number
  ? { [MK in MV]: MK extends CV ? undefined : Migration<MK> }
  : Partial<Record<number, Migration<number>>>;

function assertValidKey<T>(
  key: T,
): asserts key is Exclude<string extends T ? T : never, typeof VERSION_FIELD> {
  if (typeof key !== 'string') {
    throw new TypeError(`Storage key ${String(key)} is not a string`, { cause: key });
  }
  if (key === VERSION_FIELD) {
    throw new RangeError(`Storage key ${VERSION_FIELD} is reserved`, { cause: key });
  }
}

type ExtensionStorageSchema<T = Record<string, unknown>> = Omit<
  T,
  number | symbol | typeof VERSION_FIELD
>;

export class ExtensionStorage<
  T extends ExtensionStorageSchema<T>,
  V extends number | undefined = number | undefined,
> {
  private migrations?: ExtensionStorageMigrations<V>;

  constructor(
    private readonly storage: chrome.storage.StorageArea,
    private readonly defaults: ExtensionStorageDefaults<T>,
    private readonly version: V,
    migrations?: ExtensionStorageMigrations<V>,
  ) {
    for (const key of Object.keys(defaults)) {
      assertValidKey(key);
    }

    if (migrations) {
      this.provideMigrations(migrations);
    }
  }

  /**
   * Retrieves a value by key (waits for lock).
   *
   * May return a default value.
   */
  async get<K extends keyof T>(key: K): Promise<T[K]> {
    assertValidKey(key);
    return this.withLock(async () => {
      let result: Pick<T, K>;

      if (key in this.defaults && this.defaults[key] !== undefined) {
        const defaultValue = this.defaults[key];
        // requires obvious cast for some reason
        const queryWithDefault = { [key satisfies K]: defaultValue satisfies T[K] } as Pick<T, K>;
        result = (await this.storage.get(queryWithDefault)) as Pick<T, K>;
      } else {
        const queryKey = [key];
        result = (await this.storage.get(queryKey)) as Pick<T, K>;
      }

      return result[key];
    });
  }

  /**
   * Sets value for key (waits for lock).
   */
  async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    assertValidKey(key);
    await this.withLock(async () => this.storage.set({ [key]: value }));
  }

  /**
   * Removes key/value from db (waits for lock).
   */
  async remove(key: keyof T): Promise<void> {
    assertValidKey(key);
    await this.withLock(async () => this.storage.remove(String(key)));
  }

  /**
   * Adds a listener to detect changes in the storage.
   */
  addListener(listener: ChromeStorageListener<T>) {
    this.storage.onChanged.addListener(
      listener as (changes: Record<string, chrome.storage.StorageChange>) => void,
    );
  }

  /**
   * Removes a listener from the storage change listeners.
   */
  removeListener(listener: ChromeStorageListener<T>) {
    this.storage.onChanged.removeListener(
      listener as (changes: Record<string, chrome.storage.StorageChange>) => void,
    );
  }

  /**
   * A migration happens for the entire storage object. Process:
   * During runtime:
   * - get, set, or remove is called
   * - acquire the lock
   * - wait for initialization or migration to complete
   * - execute the storage get, set, or remove operation
   */
  private async withLock<R>(fn: () => Promise<R>): Promise<R> {
    return navigator.locks.request(`${chrome.runtime.id}.storage`, { mode: 'exclusive' }, () =>
      this.migrateOrInitializeIfNeeded().then(fn),
    ) as Promise<R>;
  }

  private async getStoredVersion(): Promise<number | undefined> {
    const { [VERSION_FIELD]: version } = await this.storage.get(VERSION_FIELD);

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- default case
    switch (typeof version) {
      case 'undefined':
      case 'number':
        return version;
      default:
        throw new TypeError(`Stored version ${String(version as unknown)} is not a number`, {
          cause: version,
        });
    }
  }

  public provideMigrations(migrations: ExtensionStorageMigrations<V>) {
    if (!this.version) {
      throw new RangeError('Unversioned storage will never use migrations');
    }

    const zeroToNow = Array.from(new Array(this.version).keys());
    if (!zeroToNow.every(v => v in migrations)) {
      throw new RangeError('Migration versions missing or out of range');
    }

    this.migrations = migrations;
  }

  private async migrateAllFields(initialVersion: number, initialState: Record<string, unknown>) {
    let [mVersion, mState] = [initialVersion, initialState];

    let migrate = undefined;
    while ((migrate = this.migrations?.[mVersion])) {
      [mVersion, mState] = [migrate.version(mVersion), await migrate.transform(mState)];
    }

    // confirm resulting version
    if (mVersion !== this.version) {
      throw new RangeError(`No migration function provided for version: ${mVersion}`, {
        cause: { initialVersion, migrations: this.migrations },
      });
    }

    await this.commitMigration({ ...mState, [VERSION_FIELD]: mVersion }, initialState);
  }

  private async commitMigration(commit: Record<string, unknown>, backup: Record<string, unknown>) {
    /**
     * storage fields may migrate to an undefined value, or may be absent from
     * the migrated format. since setting an undefined value is a no-op, any
     * defined pre-migration value could persist in storage, causing problems.
     * additionally, clearing storage cannot be atomic with writing to storage,
     * but writing to storage may fail.
     *
     * so to avoid data loss if the storage is successfully cleared but then
     * fails to write, old keys are only removed after a successful write.
     *
     * must clean up fields:
     * - present in old state but absent from new state (undefined)
     * - present in old state but no value in new state (undefined)
     *
     * ideally a rollback would perform the inverse, but instead we prefer to
     * avoid continued mainpulation of failing storage.
     */
    const cleanup = Object.keys(backup).filter(k => commit[k] === undefined);

    const failures = [];
    const messages = [];

    try {
      // ATTEMPT COMMIT
      await this.storage.set(commit);

      try {
        // ATTEMPT CLEANUP
        await this.storage.remove(cleanup);

        // SUCCESS
        return;

        /*
    ------ FAILURE STATES ------
        */
      } catch (cleanupFailure) {
        // this failure is quite unlikely, but possible due to quota. in this
        // case, new state was written, but some partial old state may still be
        // present. attempting a rollback is probably more dangerous than
        // giving up.
        messages.push('Cleanup failed.');
        failures.push(cleanupFailure);
      }
    } catch (commitFailure) {
      messages.push('Commit failed.');
      failures.push(commitFailure);

      // ATTEMPT ROLLBACK
      try {
        await this.storage.set(backup);
        messages.push('Rollback successful.');
      } catch (rollbackFailure) {
        failures.push(rollbackFailure);
        messages.push('Rollback failed.');
      }
    }

    throw new AggregateError(failures, messages.join(' '), {
      cause: { backup, commit },
    });
  }

  private async migrateOrInitializeIfNeeded(): Promise<void> {
    if (!this.version) {
      return;
    }

    try {
      const storedVersion = await this.getStoredVersion();

      // if storage is empty, initialize with current version
      if (storedVersion === undefined && !(await this.storage.getBytesInUse())) {
        await this.storage.set({ [VERSION_FIELD]: this.version });
        return;
      }

      // storage is current, no migration needed
      if (storedVersion === this.version) {
        return;
      }

      // no migrations available
      if (!this.migrations) {
        throw new ReferenceError('No migrations available');
      }

      // perform migration
      await this.migrateAllFields(storedVersion ?? 0, await this.storage.get());

      // migration complete
      return;
    } catch (e) {
      console.error(e);
      throw new Error(`There was an error with migrating the database: ${String(e)}`);
    }
  }
}
