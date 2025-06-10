import { ExtensionStorage } from './base';
import { localDefaults } from './local';
import { localV0Migration } from './migrations/local-v1-migration';
import { sessionV0Migration } from './migrations/session-v1-migration';
import { sessionDefaults, SessionStorageState } from './session';
import type { LocalStorageState } from './types';

// Helpful for testing interactions with session & local storage
export class MockStorageArea implements chrome.storage.StorageArea {
  public mockStore = new Map<string, unknown>();

  get = ((
    keys?: string | string[] | Record<string, unknown> | null,
  ): Promise<Record<string, unknown>> =>
    new Promise(resolve => {
      const result: Record<string, unknown> = {};

      const toCheck: string[] = [];
      if (typeof keys === 'string') {
        toCheck.push(keys);
      } else if (Array.isArray(keys)) {
        toCheck.push(...keys);
      } else if (keys && typeof keys === 'object' && !Array.isArray(keys)) {
        toCheck.push(...Object.keys(keys));
      } else if (keys == null) {
        // If no keys provided, get all keys from the store
        toCheck.push(...this.mockStore.keys());
      }

      toCheck.forEach(key => {
        const value = this.mockStore.get(key);
        if (value !== undefined) {
          result[key] = value;
        } else if (keys && typeof keys === 'object') {
          result[key] = keys[key as keyof typeof keys];
        }
      });

      resolve(result);
    })) as chrome.storage.StorageArea['get'];

  async getBytesInUse(): Promise<number> {
    return new Promise(resolve => {
      resolve(this.mockStore.size);
    });
  }

  async remove(key: string): Promise<void> {
    return new Promise(resolve => {
      this.mockStore.delete(key);
      resolve();
    });
  }

  async clear(): Promise<void> {
    this.mockStore.clear();
    return Promise.resolve();
  }

  setAccessLevel = (): Promise<void> => Promise.resolve();

  async set(items: Record<string, unknown>): Promise<void> {
    return new Promise(resolve => {
      for (const key in items) {
        // In chrome storage, setting undefined values removes them from the store
        if (items[key] === undefined) {
          this.mockStore.delete(key);
        }
        this.mockStore.set(key, items[key]);
      }
      resolve();
    });
  }

  onChanged = {
    addListener() {
      // no-op
    },
    removeListener() {
      // no-op
    },
  } as unknown as chrome.storage.StorageArea['onChanged'];
}

export const mockSessionExtStorage = () =>
  new ExtensionStorage<SessionStorageState>({
    storage: new MockStorageArea(),
    defaults: sessionDefaults,
    version: {
      current: 1,
      migrations: {
        0: sessionV0Migration,
      },
    },
  });

export const mockLocalExtStorage = () =>
  new ExtensionStorage<LocalStorageState>({
    storage: new MockStorageArea(),
    defaults: localDefaults,
    version: {
      current: 1,
      migrations: {
        0: localV0Migration,
      },
    },
  });
