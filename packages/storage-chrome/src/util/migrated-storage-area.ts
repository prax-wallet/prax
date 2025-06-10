import { StorageDefaults } from '../defaults';
import { ChromeStorageListener, ChromeStorageArea } from './chrome-storage-area';
import { StorageRecord } from './storage-record';
import { withStorageLock } from './storage-lock';

export class MigratedStorageArea<T extends StorageRecord, A extends ChromeStorageArea<T>> {
  /** @todo migration value */
  public static readonly migration: Promise<void> = Promise.reject(new Error());

  private static migrationComplete = false;

  static {
    void MigratedStorageArea.migration.then(() => {
      MigratedStorageArea.migrationComplete = true;
    });
  }

  public static get ready() {
    return MigratedStorageArea.migrationComplete;
  }

  constructor(
    private readonly area: A,
    private readonly defaults: StorageDefaults<T>,
  ) {}

  private withLock = async <L>(
    existingLock: Lock | undefined,
    opt: { mode: LockMode; signal?: AbortSignal },
    cb: (storage: ChromeStorageArea<T>, withLock: Lock) => L,
  ): Promise<L> => {
    return MigratedStorageArea.migration.then(() =>
      existingLock
        ? cb(this.area, existingLock)
        : withStorageLock(opt, acquiredLock => cb(this.area, acquiredLock)),
    );
  };

  public addListener(listener: ChromeStorageListener<T>): void {
    if (!MigratedStorageArea.ready) {
      throw new Error('Await migration before adding listeners.');
    }
    this.area.onChanged.addListener(listener);
  }

  public removeListener(listener: ChromeStorageListener<T>): void {
    this.area.onChanged.removeListener(listener);
  }

  public async get<K extends keyof T>(key: K, lock?: Lock): Promise<T[K]> {
    const mode = 'shared';

    const defaultValue = this.defaults[key];

    return this.withLock(lock, { mode }, async storage => {
      if (defaultValue !== undefined) {
        /** @note typescript forgets the key type when it's applied */
        const query = { [key satisfies K]: defaultValue satisfies T[K] } as Required<Pick<T, K>>;

        const result = await storage.get(query);
        return result[key];
      }
      const result = await storage.get([key]);
      return result[key];
    });
  }

  async set<K extends keyof T>(key: K, value: Required<T>[K], lock?: Lock): Promise<void> {
    const mode = 'exclusive';

    const query = { [key]: value } as Required<Pick<T, K>>;
    return this.withLock(lock, { mode }, storage => storage.set(query));
  }

  async remove(key: keyof T, lock?: Lock): Promise<void> {
    const mode = 'exclusive';
    await this.withLock(lock, { mode }, storage => storage.remove(key));
  }
}
