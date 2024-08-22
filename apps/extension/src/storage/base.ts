import { EmptyObject, isEmptyObj } from '@penumbra-zone/types/utility';

export type Listener = (
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
) => void;

export interface IStorage {
  get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  getBytesInUse(keys?: string | string[] | null): Promise<number>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
  onChanged: {
    addListener(listener: Listener): void;
    removeListener(listener: Listener): void;
  };
}

export type MigrationFn<OldState, NewState> = (prev: OldState) => NewState | Promise<NewState>;

export type ExtensionStorageDefaults<T extends { dbVersion: number }> = Required<
  Omit<T, 'dbVersion'>
>;

export interface RequiredMigrations {
  // Explicitly require key '0' representing...
  // It is quite difficult writing a generic that covers all migration function kinds.
  // Therefore, the writer of the migration should ensure it is typesafe when they define it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  0: MigrationFn<any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: number]: MigrationFn<any, any>; // Additional numeric keys
}

export interface Version {
  current: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10; // and so on, just not zero
  migrations: RequiredMigrations;
}

export interface ExtensionStorageProps<T extends { dbVersion: number }> {
  storage: IStorage;
  defaults: ExtensionStorageDefaults<T>;
  version: Version;
}

export class ExtensionStorage<T extends { dbVersion: number }> {
  private readonly storage: IStorage;
  private readonly defaults: ExtensionStorageDefaults<T>;
  private readonly version: Version;
  private dbLock: Promise<void> | undefined = undefined;

  constructor({ storage, defaults, version }: ExtensionStorageProps<T>) {
    this.storage = storage;
    this.defaults = defaults;
    this.version = version;
  }

  async get<K extends keyof T>(key: K): Promise<T[K]> {
    return this.withDbLock(() => {
      return this._get(key) as Promise<T[K]>;
    });
  }

  // TODO: Retrieving will return either... document
  private async _get<K extends keyof T>(key: K): Promise<T[K] | undefined> {
    const result = (await this.storage.get(String(key))) as Record<K, T[K]> | EmptyObject;
    return isEmptyObj(result) ? undefined : result[key];
  }

  async set<K extends Exclude<keyof T, 'dbVersion'>>(key: K, value: T[K]): Promise<void> {
    await this.withDbLock(async () => {
      await this._set({ [key]: value } as Record<K, T[K]>);
    });
  }

  private async _set<K extends keyof T>(keys: Record<K, T[K]>): Promise<void> {
    await this.storage.set(keys);
  }

  async remove<K extends keyof T>(key: K): Promise<void> {
    await this.withDbLock(async () => {
      await this.storage.remove(String(key));
    });
  }

  addListener(listener: Listener) {
    this.storage.onChanged.addListener(listener);
  }

  removeListener(listener: Listener) {
    this.storage.onChanged.removeListener(listener);
  }

  private async withDbLock<R>(fn: () => Promise<R>): Promise<R> {
    if (this.dbLock) {
      await this.dbLock;
    }

    this.dbLock = this.migrateOrInitializeIfNeeded();

    try {
      await this.dbLock;
      return await fn();
    } finally {
      this.dbLock = undefined;
    }
  }

  private async migrateAllFields(storedVersion: number): Promise<number> {
    const migrationFn = this.version.migrations[storedVersion];

    if (!migrationFn) {
      throw new Error(`No migration function provided for version: ${storedVersion}`);
    }

    const currentDbState = await this.storage.get();
    // Migrations save the database intermediate states hard to type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const nextState = await migrationFn(currentDbState);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await this._set(nextState);

    return storedVersion + 1;
  }

  private async migrateOrInitializeIfNeeded(): Promise<void> {
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
  }
}
