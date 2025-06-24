import { VERSION_FIELD } from './version-field';

export type ChromeStorageListener<S = never> = (changes: {
  [k in keyof S]?: { newValue?: S[k]; oldValue?: S[k] };
}) => void;

export type ExtensionStorageDefaults<T extends Record<string, unknown>> = {
  [K in keyof T]: undefined extends T[K] ? never : T[K];
};

export type MigrationFn<OldState = Record<string, unknown>, NewState = Record<string, unknown>> = (
  prev: Readonly<Partial<OldState>>,
) => Promise<[version: number, state: NewState]>;

async function migrate(
  migrations: Record<number, MigrationFn>,
  ...begin: [version: number, state: Record<string, unknown>]
): Promise<[version: number, state: Record<string, unknown>]> {
  let [version, state] = begin;
  let migration: MigrationFn | undefined;
  while ((migration = migrations[version])) {
    [version, state] = await migration(state);
  }
  return [version, state];
}

export class ExtensionStorage<T extends Record<string, unknown>> {
  constructor(
    private readonly storage: chrome.storage.StorageArea,
    private readonly defaults: ExtensionStorageDefaults<T>,
    private readonly version?: { current: number; migrations: Record<number, MigrationFn> },
  ) {}

  /**
   * Retrieves a value by key (waits for lock).
   *
   * May return a default value.
   */
  async get<K extends Exclude<keyof T, typeof VERSION_FIELD>>(key: K): Promise<T[K]> {
    if (key === VERSION_FIELD) {
      throw new TypeError(`Cannot get ${VERSION_FIELD}`);
    }
    return this.withLock(async () => {
      let query: [K] | Pick<T, K>;
      // query with or without default value
      if (key in this.defaults && this.defaults[key] !== undefined) {
        const defaultValue = this.defaults[key];
        // requires obvious cast for some reason
        query = { [key satisfies K]: defaultValue satisfies T[K] } as Pick<T, K>;
      } else {
        query = [key];
      }
      const result = (await this.storage.get(query)) as Pick<T, K>;
      return result[key];
    });
  }

  /**
   * Sets value for key (waits for lock).
   */
  async set<K extends Exclude<keyof T, typeof VERSION_FIELD>>(key: K, value: T[K]): Promise<void> {
    if (key === VERSION_FIELD) {
      throw new TypeError(`Cannot set ${VERSION_FIELD}`);
    }
    await this.withLock(async () => this.storage.set({ [key]: value }));
  }

  /**
   * Removes key/value from db (waits for lock).
   */
  async remove(key: Exclude<keyof T, typeof VERSION_FIELD>): Promise<void> {
    // Prevent removing dbVersion
    if (key === VERSION_FIELD) {
      throw new TypeError(`Cannot remove ${VERSION_FIELD}`);
    }
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

  private async migrateOrInitializeIfNeeded(): Promise<void> {
    if (this.version) {
      try {
        const bytesInUse = await this.storage.getBytesInUse();

        // if storage is empty, initialize with current version
        if (bytesInUse === 0) {
          await this.storage.set({ [VERSION_FIELD]: this.version.current });
          return;
        }

        const { [VERSION_FIELD]: storedVersion = 0 } = await this.storage.get(VERSION_FIELD);
        if (typeof storedVersion !== 'number') {
          throw new TypeError(`Invalid stored version: ${storedVersion}`);
        }

        // if storage is old, migrate to current version
        if (storedVersion !== this.version.current) {
          const backupState = await this.storage.get();
          const [migratedVersion, migratedState] = await migrate(
            this.version.migrations,
            storedVersion,
            backupState,
          );
          if (migratedVersion !== this.version.current) {
            throw new RangeError(`No migration function provided for version: ${migratedVersion}`, {
              cause: { storedVersion, migrations: this.version.migrations },
            });
          }
          try {
            await this.storage.clear();
            await this.storage.set({ ...migratedState, [VERSION_FIELD]: migratedVersion });
            return;
          } catch (cause) {
            console.error(cause);
            await this.storage.set(backupState);
            throw cause;
          }
        }
      } catch (e) {
        console.error(e);
        throw new Error(`There was an error with migrating the database: ${String(e)}`);
      }
    }
  }
}
