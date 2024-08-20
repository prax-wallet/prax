import { EmptyObject, isEmptyObj } from '@penumbra-zone/types/utility';

export type Listener = (
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
) => void;

export interface IStorage {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
  onChanged: {
    addListener(listener: Listener): void;
    removeListener(listener: Listener): void;
  };
}

export interface StorageItem<T> {
  version: string;
  value: T;
}

type Version = string;

export type MigrationMap<OldState, NewState> = {
  [K in keyof OldState & keyof NewState]?: (
    prev: OldState[K],
  ) => NewState[K] | Promise<NewState[K]>;
};

// It is quite difficult writing a generic that covers all migration function kinds.
// Therefore, the writer of the migration should ensure it is typesafe when they define it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Migrations<T> = Partial<Record<Version, MigrationMap<any, T>>>;

export type VersionSteps = Record<Version, Version>;

export class ExtensionStorage<T> {
  constructor(
    private storage: IStorage,
    private defaults: T,
    private version: Version,
    private migrations: Migrations<T> = {},
    private versionSteps: VersionSteps = {},
  ) {}

  async get<K extends keyof T>(key: K): Promise<T[K]> {
    const result = (await this.storage.get(String(key))) as
      | Record<K, StorageItem<T[K]>>
      | EmptyObject;

    if (isEmptyObj(result)) {
      return this.defaults[key];
    } else {
      return await this.migrateIfNeeded(key, result[key]);
    }
  }

  async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    await this.storage.set({
      [String(key)]: {
        version: this.version,
        value,
      },
    });
  }

  async remove<K extends keyof T>(key: K): Promise<void> {
    await this.storage.remove(String(key));
  }

  addListener(listener: Listener) {
    this.storage.onChanged.addListener(listener);
  }

  removeListener(listener: Listener) {
    this.storage.onChanged.removeListener(listener);
  }

  private async migrateIfNeeded<K extends keyof T>(key: K, item: StorageItem<T[K]>): Promise<T[K]> {
    // The same version means no migrations are necessary
    if (item.version === this.version) {
      return item.value;
    }

    const migrationFn = this.migrations[item.version]?.[key];

    // Perform migration if available for version & field
    const value = migrationFn ? ((await migrationFn(item.value)) as T[K]) : item.value;
    const nextVersion = this.versionSteps[item.version];

    // If the next step is not defined (bad config) or is the current version, save and exit
    if (!nextVersion || nextVersion === this.version) {
      await this.set(key, value);
      return value;
    }

    // Recurse further if there are more migration steps
    return await this.migrateIfNeeded(key, {
      version: nextVersion,
      value,
    });
  }
}
