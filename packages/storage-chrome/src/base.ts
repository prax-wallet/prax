import { ensureMigration } from './migrate';

export type Listener = Parameters<chrome.storage.StorageAreaChangedEvent['addListener']>[0];

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

  private assertAllowedKey(key: unknown): asserts key is Exclude<string, 'dbVersion'> {
    if (key === 'dbVersion') {
      throw new RangeError('Forbidden to modify dbVersion');
    }
  }

  /**
   * Retrieves a value by key (waits on ongoing migration)
   */
  async get<K extends string & keyof T>(key: K): Promise<T[K]> {
    this.assertAllowedKey(key);
    return this.withDbLock(() => {
      const defaultValue = (this.defaults as Partial<T>)[key];
      if (defaultValue !== undefined) {
        return this.storage.get({ [key]: defaultValue }).then(result => result[key] as T[K]);
      }
      return this.storage.get(key).then(result => result[key] as T[K]);
    });
  }

  /**
   * Sets value for key (waits on ongoing migration).
   * Not allowed to manually update dbversion.
   */
  async set<K extends string & keyof T>(key: K, value: T[K]): Promise<void> {
    this.assertAllowedKey(key);
    await this.withDbLock(() => this.storage.set({ [key]: value }));
  }

  /**
   * Removes key/value from db (waits on ongoing migration). If there is a default, sets that.
   */
  async remove(key: string & keyof T): Promise<void> {
    this.assertAllowedKey(key);
    await this.withDbLock(async () => this.storage.remove(key));
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
    return navigator.locks.request(
      `${chrome.runtime.id}.storage`,
      { mode: 'exclusive' },
      async () => {
        if ((await this.storage.getBytesInUse()) === 0) {
          await this.storage.set({ dbVersion: this.version.current });
        }
        await ensureMigration(this.storage, this.version);
        return fn();
      },
    ) as Promise<R>;
  }
}
