/* eslint-disable no-console -- log migrations */
import { ChromeStorageListener } from './listener';
import { Migration } from './migrations/type';
import { VERSION_FIELD } from './version-field';

/**
 * Storage fields required by schema must have default values.
 *
 * @template T storage schema
 */
export type ExtensionStorageDefaults<T> = {
  [K in keyof T]: undefined extends T[K] ? never : Required<T>[K] extends T[K] ? T[K] : never;
};

/**
 * If this storage area is versioned, migrations are provided as record mapping
 * prior versions to the applicable migration.
 *
 * @template CV current version
 * @template MV migration versions
 */
export type ExtensionStorageMigrations<CV, MV extends number = number> = CV extends number
  ? { [MK in MV]: MK extends CV ? undefined : Migration<MK> }
  : Partial<Record<number, Migration<number>>>;

/**
 * Utility to validate that a storage key is a valid string and not a reserved
 * field. Schema presence is enforced by the type system, not at runtime.
 *
 * @throws {TypeError} When `key` is not a string
 * @throws {RangeError} When `key` is the reserved VERSION_FIELD
 */
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

/**
 * A wrapper around a Chrome extension storage area. Enforces exclusive lock
 * during operations, provides versioned schema migrations.
 *
 * @template T storage schema
 * @template V storage version
 */
export class ExtensionStorage<
  T extends Record<string, unknown>,
  V extends number | undefined = number | undefined,
> {
  private migrations?: ExtensionStorageMigrations<V>;

  /**
   * @param storage storage area to use (local, sync, a mock, etc)
   * @param defaults default values for storage keys
   * @param version current version
   * @param migrations migrations
   */
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
      this.enableMigration(migrations);
    }
  }

  /**
   * Gets value from storage, or a default value (waits for lock).
   *
   * @param key to get
   * @returns stored value, or a default value
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
   * Sets value to storage (waits for lock).
   *
   * @param key to set
   * @param value to store
   */
  async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    assertValidKey(key);

    if (value === undefined || Number.isNaN(value) || value === Infinity || value === -Infinity) {
      throw new TypeError(`Forbidden no-op set of ${String(value)}`, { cause: { key, value } });
    }

    await this.withLock(async () => this.storage.set({ [key]: value }));
  }

  /**
   * Removes key from storage (waits for lock).
   *
   * @param key to set
   */
  async remove(key: keyof T): Promise<void> {
    assertValidKey(key);
    await this.withLock(async () => this.storage.remove(String(key)));
  }

  /**
   * Adds a listener to detect changes in the storage.
   */
  addListener(listener: ChromeStorageListener<T>) {
    this.storage.onChanged.addListener(listener as ChromeStorageListener);
  }

  /**
   * Removes a listener from the storage change listeners.
   */
  removeListener(listener: ChromeStorageListener<T>) {
    this.storage.onChanged.removeListener(listener as ChromeStorageListener);
  }

  /**
   * Executes a storage operation with exclusive storage lock. Ensures
   * migration/initialization occurs before storage operations.
   *
   * @param fn storage operation callback
   * @returns result of the storage operation callback
   */
  private async withLock<R>(fn: () => Promise<R>): Promise<R> {
    return navigator.locks.request(`${chrome.runtime.id}.storage`, { mode: 'exclusive' }, () =>
      this.migrateOrInitializeIfNeeded().then(fn),
    ) as Promise<R>;
  }

  /**
   * Migrates state in-memory to the current version. Does not perform any
   * storage read or write.
   *
   * @returns migrated state
   * @throws {RangeError} When no migration exists for a needed version
   */
  private async migrateAllFields(
    initialVersion: number,
    initialState: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    let [mVersion, mState] = [initialVersion, initialState];

    let migrate = undefined;
    console.group(`migrating ${initialVersion} to ${this.version}`);
    while ((migrate = this.migrations?.[mVersion])) {
      console.log('from', mVersion, mState);
      [mVersion, mState] = [migrate.version(mVersion), await migrate.transform(mState)];
    }
    console.log('stopped', mVersion, mState);
    console.groupEnd();

    // confirm resulting version
    if (mVersion !== this.version) {
      throw new RangeError(`No migration provided for version: ${mVersion}`, {
        cause: { initialVersion, migrations: this.migrations },
      });
    }

    return { ...mState, [VERSION_FIELD]: mVersion };
  }

  /**
   * May initialize storage with a version field, or perform migration. Called
   * upon lock acquisition, before every storage operation by class methods.
   *
   * @throws {ReferenceError} When migrations are needed but not available
   * @throws {Error} When initialization or migration fails
   */
  private async migrateOrInitializeIfNeeded(): Promise<void> {
    // if storage is unversioned, no migration needed
    if (!this.version) {
      return;
    }

    const storedVersion = await this.getStoredVersion();

    // storage is current, no migration needed
    if (storedVersion === this.version) {
      return;
    }

    try {
      // if storage is empty, initialize with current version
      if (storedVersion === undefined && !(await this.storage.getBytesInUse())) {
        await this.storage.set({ [VERSION_FIELD]: this.version });
        return;
      }
    } catch (e) {
      console.error(e);
      throw new Error(`Failed to initialize storage: ${String(e)}`, { cause: e });
    }

    try {
      // no migrations available
      if (!this.migrations) {
        throw new ReferenceError('No migrations available');
      }

      // perform migration
      const initialVersion = storedVersion ?? 0;
      const initialState = await this.storage.get();

      const commit = await this.migrateAllFields(initialVersion, initialState);

      // keys from the old state which are `undefined` in the new state
      const cleanup = Object.keys(initialState).filter(k => commit[k] === undefined);

      // write new state on top of the initial state
      await this.storage.set(commit);
      // clean up keys which migrated to `undefined`
      await this.storage.remove(cleanup);
      // migration complete
    } catch (e) {
      console.error(e);
      throw new Error(`Failed to migrate storage: ${String(e)}`, { cause: e });
    }
  }

  private async getStoredVersion(): Promise<number | undefined> {
    const { [VERSION_FIELD]: version } = await this.storage.get(VERSION_FIELD);

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- default case
    switch (typeof version) {
      case 'undefined':
      case 'number':
        return version;
      default:
        throw new TypeError(`Stored version ${String(version)} is not a number`, {
          cause: version,
        });
    }
  }

  /**
   * Enables migration by this instance.
   *
   * @throws {RangeError} When storage is unversioned
   * @throws {RangeError} When migrations are incomplete
   */
  public enableMigration(migrations: ExtensionStorageMigrations<V>) {
    if (!this.version) {
      throw new RangeError('Unversioned storage will never use migrations');
    }

    const zeroToNow = Array.from(new Array(this.version).keys());
    if (!zeroToNow.every(v => v in migrations)) {
      const missing = zeroToNow.filter(v => !(v in migrations));
      throw new RangeError(`Migration versions missing: ${missing.join()}`, {
        cause: { migrations, version: this.version },
      });
    }

    this.migrations = migrations;
  }
}
