import { StorageRecord } from './storage-record';

export type ChromeStorageChange<S extends StorageRecord> = {
  [K in keyof S]?: { oldValue?: S[K]; newValue?: S[K] };
};

export type ChromeStorageListener<S extends StorageRecord> = (
  changes: ChromeStorageChange<S>,
) => void;

export type ChromeLocalStorageArea<S extends StorageRecord> = ChromeStorageArea<S> &
  Omit<chrome.storage.LocalStorageArea, keyof chrome.storage.StorageArea>;

type ChromeSessionStorageArea<S extends StorageRecord> = ChromeStorageArea<S> &
  Omit<chrome.storage.SessionStorageArea, keyof chrome.storage.StorageArea>;

export type ChromeSyncStorageArea<S extends StorageRecord> = ChromeStorageArea<S> &
  Omit<chrome.storage.SyncStorageArea, keyof chrome.storage.StorageArea>;

type ChromeManagedStorageArea<S extends StorageRecord> = Omit<
  ChromeStorageArea<S>,
  'set' | 'remove' | 'clear'
>;

/**
 * Type assistance for `chrome.storage.StorageArea`.  Use the
 * `ChromeStorageRecord` parameter to explain your format to the type system.
 */
export interface ChromeStorageArea<S extends StorageRecord>
  extends Omit<
    chrome.storage.StorageArea,
    'get' | 'getBytesInUse' | 'set' | 'remove' | 'onChanged'
  > {
  get: {
    // retrieve all keys
    (keys?: null): Promise<Partial<S>>;
    // retrieve subset of keys
    <K extends keyof S>(keys: K | K[]): Promise<Pick<S, K>>;
    <K extends keyof S>(keyDefaults: Required<Pick<S, K>>): Promise<Required<Pick<S, K>>>;
  };
  getBytesInUse: <K extends keyof S>(keys?: K | K[] | null) => Promise<number>;
  set: <K extends keyof S>(items: Required<Pick<S, K>>) => Promise<void>;
  remove: <K extends keyof S>(keys: K | K[]) => Promise<void>;
  onChanged: {
    addListener: (listener: ChromeStorageListener<S>) => void;
    removeListener: (listener: ChromeStorageListener<S>) => void;
    hasListener: (listener: ChromeStorageListener<S>) => boolean;
    hasListeners: () => boolean;
  };
}

/**
 * Access Chrome extension storage areas with type guidance.
 *
 * Example:
 *
 * ```ts
 * interface MySchema {
 *   userId?: string;
 *   preferences: { theme: 'light' | 'dark' };
 * }
 *
 * const local = ChromeStorage.Local<MySchema>();
 * const { userId, preferences } = await local.get(['userId', 'preferences']);
 *
 * userId satisfies string | undefined;
 * preferences satisfies { theme: 'light' | 'dark' };
 * ```
 *
 * Of course, runtime safety is not guaranteed if you write to storage without
 * following the schema.
 *
 * ```ts
 * // write without typed interface...
 * chrome.storage.local.set({ preferences: null });
 *
 * // then access with typed interface...
 * const local = ChromeStorage.Local<MySchema>();
 * const { preferences } = await local.get('preferences');
 * preferences satisfies { theme: 'light' | 'dark' };
 *
 * // will throw a ReferenceError!
 * console.log(preferences.theme);
 * ```
 */

export const ChromeStorage = {
  local<XL extends StorageRecord>(): ChromeLocalStorageArea<XL> {
    return chrome.storage.local as never;
  },

  session<XS extends StorageRecord>(): ChromeSessionStorageArea<XS> {
    return chrome.storage.session as never;
  },

  sync<XY extends StorageRecord>(): ChromeSyncStorageArea<XY> {
    return chrome.storage.sync as never;
  },

  managed<XM extends StorageRecord>(): ChromeManagedStorageArea<XM> {
    return chrome.storage.managed as never;
  },
} as const;
