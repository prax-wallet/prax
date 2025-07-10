import { EmptyObject, isEmptyObj } from '@penumbra-zone/types/utility';

export type Listener = (
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
) => void;

/**
 * To be imported in order to define a migration from the previous schema to the new one
 * Note: If one adds an optional field (newField: string | undefined), a migration is not necessary.
 *       If one adds a new required field (newField: string[]), a migration is necessary
 *       to have the default value in the database.
 */
export type MigrationFn<OldState, NewState> = (prev: OldState) => NewState | Promise<NewState>;

// All properties except for dbVersion. While this is an available key to query,
// it is defined in the version field.
export type ExtensionStorageDefaults<T extends { dbVersion: number }> = Required<
  Omit<T, 'dbVersion'>
>;

/**
 * get(), set(), and remove() operations kick off storage migration process if it is necessary
 *
 * A migration happens for the entire storage object. For dev:
 * - Define RequiredMigrations within version field in ExtensionStorageProps
 * - The key is the version that will need migrating to that version + 1 (the next version)
 * - The value is a function that takes that versions state and migrates it to the new state (strongly type both)
 *   - Note: It is quite difficult writing a generic that covers all migration function kinds.
 *           Given the use of any's, the writer of the migration should ensure it is typesafe when they define it.
 */
export interface RequiredMigrations {
  // Explicitly require key 0 representing a special key for migrating from
  // a state prior to the current implementation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- EXISTING USE
  0: MigrationFn<any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- EXISTING USE
  [key: number]: MigrationFn<any, any>; // Additional numeric keys
}

export interface Version {
  current: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10; // and so on, just not zero as it's reserved
  migrations: RequiredMigrations;
}

export interface ExtensionStorageProps<T extends { dbVersion: number }> {
  storage: chrome.storage.StorageArea;
  defaults: ExtensionStorageDefaults<T>;
  version: Version;
}

export class ExtensionStorage<T extends { dbVersion: number }> {
  private readonly storage: chrome.storage.StorageArea;
  private readonly defaults: ExtensionStorageDefaults<T>;
  private readonly version: Version;

  constructor({ storage, defaults, version }: ExtensionStorageProps<T>) {
    this.storage = storage;
    this.defaults = defaults;
    this.version = version;
  }

  /**
   * Retrieves a value by key (waits on ongoing migration)
   */
  async get<K extends keyof T>(key: K): Promise<T[K]> {
    return this.withDbLock(() => {
      return this._get(key) as Promise<T[K]>;
    });
  }

  /**
   * Retrieving from chrome storage will return an object with the key and value:
   *  { fullSyncHeight: 923582341 }
   * This function will return its value. If there isn't a value in the db for this key,
   * chrome storage will return an empty object. For this case, we'll return undefined.
   */
  private async _get<K extends keyof T>(key: K): Promise<T[K] | undefined> {
    const result = (await this.storage.get(String(key))) as Record<K, T[K]> | EmptyObject;
    return isEmptyObj(result) ? undefined : result[key];
  }

  /**
   * Sets value for key (waits on ongoing migration).
   * Not allowed to manually update dbversion.
   */
  async set<K extends Exclude<keyof T, 'dbVersion'>>(key: K, value: T[K]): Promise<void> {
    if (value === undefined || Number.isNaN(value) || value === Infinity || value === -Infinity) {
      throw new TypeError(`Forbidden no-op set of ${String(value)}`, { cause: { key, value } });
    }

    await this.withDbLock(async () => {
      await this._set({ [key]: value } as Record<K, T[K]>);
    });
  }

  /**
   * Private set method that circumvents need to wait on migration lock (use normal set() for that)
   */
  private async _set<K extends keyof T>(keys: Record<K, T[K]>): Promise<void> {
    await this.storage.set(keys);
  }

  /**
   * Removes key/value from db (waits on ongoing migration). If there is a default, sets that.
   */
  async remove(key: Exclude<keyof T, 'dbVersion'>): Promise<void> {
    await this.withDbLock(async () => {
      // Prevent removing dbVersion
      if (key === 'dbVersion') {
        throw new Error('Cannot remove dbVersion');
      }

      const defaultValue = this.defaults[key];
      if (defaultValue !== undefined) {
        await this._set({ [key]: defaultValue } as Record<typeof key, T[typeof key]>);
      } else {
        await this.storage.remove(String(key));
      }
    });
  }

  /**
   * Adds a listener to detect changes in the storage.
   */
  addListener(listener: Listener) {
    this.storage.onChanged.addListener(listener);
  }

  /**
   * Removes a listener from the storage change listeners.
   */
  removeListener(listener: Listener) {
    this.storage.onChanged.removeListener(listener);
  }

  /**
   * A migration happens for the entire storage object. Process:
   * During runtime:
   * - get, set, or remove is called
   * - acquire the lock
   * - wait for initialization or migration to complete
   * - execute the storage get, set, or remove operation
   */
  private async withDbLock<R>(fn: () => Promise<R>): Promise<R> {
    return navigator.locks.request(`${chrome.runtime.id}.storage`, { mode: 'exclusive' }, () =>
      this.migrateOrInitializeIfNeeded().then(fn),
    ) as Promise<R>;
  }

  /**
   * Migrates all fields from a given version to the next.
   */
  private async migrateAllFields(storedVersion: number): Promise<number> {
    const migrationFn = this.version.migrations[storedVersion];

    if (!migrationFn) {
      throw new Error(`No migration function provided for version: ${storedVersion}`);
    }

    const currentDbState = await this.storage.get();
    // Migrations save the database intermediate states hard to type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- EXISTING USE
    const nextState = await migrationFn(currentDbState);

    // Clean old data
    await this.storage.clear();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- EXISTING USE
    await this._set(nextState);

    return storedVersion + 1;
  }

  /**
   * Initializes the database with defaults or performs migrations (multiple possible if a sequence is needed).
   */
  private async migrateOrInitializeIfNeeded(): Promise<void> {
    try {
      // If db is empty, initialize it with defaults.
      const bytesInUse = await this.storage.getBytesInUse();
      if (bytesInUse === 0) {
        const allDefaults = { ...this.defaults, dbVersion: this.version.current };
        // @ts-expect-error Typescript does not know how to combine the above types
        await this._set(allDefaults);
        return;
      }

      let storedVersion = (await this._get('dbVersion')) ?? 0; // default to zero
      // If stored version is not the same, keep migrating versions until current
      while (storedVersion !== this.version.current) {
        storedVersion = await this.migrateAllFields(storedVersion);
      }
    } catch (e) {
      throw new Error(`There was an error with migrating the database: ${String(e)}`);
    }
  }
}
