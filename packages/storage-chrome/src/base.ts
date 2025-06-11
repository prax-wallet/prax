import { EmptyObject, isEmptyObj } from '@penumbra-zone/types/utility';

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

  private assertAllowedKey(
    key: string & keyof T,
  ): asserts key is Exclude<string & keyof T, 'dbVersion'> {
    const forbidden = ['dbVersion'];
    if (forbidden.includes(key)) {
      throw new RangeError(`Forbidden to modify ${key}`);
    }
  }

  /**
   * Retrieves a value by key (waits on ongoing migration)
   */
  async get<K extends string & keyof T>(key: K): Promise<T[K] | undefined> {
    return this.withDbLock(async () => {
      const result = (await this.storage.get(key)) as Record<K, T[K]> | EmptyObject;
      return isEmptyObj(result) ? undefined : result[key];
    });
  }

  /**
   * Sets value for key (waits on ongoing migration).
   * Not allowed to manually update dbversion.
   */
  async set<K extends Exclude<string & keyof T, 'dbVersion'>>(key: K, value: T[K]): Promise<void> {
    await this.withDbLock(async () => {
      await this.storage.set({ [key]: value } as Record<K, T[K]>);
    });
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
        await this.storage.set({ [key]: defaultValue } as Record<typeof key, T[typeof key]>);
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
    return navigator.locks.request(
      `${chrome.runtime.id}.storage`,
      { mode: 'exclusive' },
      async () => {
        await this.migrateOrInitializeIfNeeded();
        return fn();
      },
    ) as Promise<R>;
  }

  /**
   * Initializes the database with defaults or performs migrations (multiple possible if a sequence is needed).
   */
  private async migrateOrInitializeIfNeeded(): Promise<void> {
    let storedVersion = await this.storage
      .get('dbVersion')
      .then(({ dbVersion }) => dbVersion as unknown);

    try {
      // If db is empty, initialize it with defaults.
      const bytesInUse = await this.storage.getBytesInUse();
      if (bytesInUse === 0) {
        const allDefaults = { ...this.defaults, dbVersion: this.version.current };
        await this.storage.set(allDefaults);
        return;
      }

      if (storedVersion === this.version.current) {
        return;
      }

      if (storedVersion == null) {
        console.warn('Migrating from legacy storage!');
        storedVersion = 0;
      }

      if (typeof storedVersion !== 'number') {
        throw new TypeError(`Storage version type ${typeof storedVersion} is not number`, {
          cause: storedVersion,
        });
      }

      if (storedVersion > this.version.current) {
        throw new RangeError(`Storage version ${storedVersion} is from the future`, {
          cause: storedVersion,
        });
      }

      let migrationIndex = storedVersion;
      while (migrationIndex < this.version.current) {
        const migrationFn = this.version.migrations[migrationIndex];

        if (!migrationFn) {
          throw new ReferenceError(`Storage version ${migrationIndex} has no migration function`);
        }

        const currentDbState = await this.storage.get();
        const nextState: unknown = await migrationFn(currentDbState as unknown);
        if (!nextState || typeof nextState !== 'object') {
          throw new TypeError(
            `Migration ${migrationIndex} produced invalid ${typeof nextState} state`,
            { cause: nextState },
          );
        }
        await this.storage.set(nextState as Record<string, unknown>);
        migrationIndex++;
      }

      if (migrationIndex !== this.version.current) {
        throw new RangeError(`Migration stopped at ${migrationIndex}`, {
          cause: this.version.migrations,
        });
      }
    } catch (cause) {
      console.error('Failed to migrate', cause);
      throw new MigrationError(
        `Failed to migrate version ${String(storedVersion)} to ${this.version.current}`,
        { cause },
      );
    }
  }
}

class MigrationError extends Error {
  constructor(migrationMessage: string, options?: ErrorOptions) {
    const { message, cause } =
      options?.cause instanceof Error
        ? options.cause
        : { message: String(options?.cause), cause: options?.cause };
    super(`${migrationMessage}: ${message}`, { ...options, cause });
    this.name = 'MigrationError';
  }
}
