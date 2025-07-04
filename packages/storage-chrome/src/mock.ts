import { ExtensionStorage, IStorage } from './base';
import { localDefaults } from './local';
import { localV0Migration } from './migrations/local-v1-migration';
import { sessionV0Migration } from './migrations/session-v1-migration';
import { sessionDefaults, SessionStorageState } from './session';
import type { LocalStorageState } from './types';

// Helpful for testing interactions with session & local storage
export class MockStorageArea implements IStorage {
  private store = new Map<string, unknown>();

  async get(
    keys?: string | string[] | Record<string, unknown> | null,
  ): Promise<Record<string, unknown>> {
    return new Promise(resolve => {
      const result: Record<string, unknown> = {};

      const toCheck: string[] = [];
      if (typeof keys === 'string') {
        toCheck.push(keys);
      } else if (Array.isArray(keys)) {
        toCheck.push(...keys);
      } else if (keys && typeof keys === 'object' && !Array.isArray(keys)) {
        toCheck.push(...Object.keys(keys));
      } else if (!keys) {
        // If no keys provided, get all keys from the store
        toCheck.push(...this.store.keys());
      }

      toCheck.forEach(key => {
        const value = this.store.get(key);
        if (value !== undefined) {
          result[key] = value;
        }
      });

      resolve(result);
    });
  }

  async getBytesInUse(): Promise<number> {
    return new Promise(resolve => {
      resolve(this.store.size);
    });
  }

  async remove(key: string): Promise<void> {
    return new Promise(resolve => {
      this.store.delete(key);
      resolve();
    });
  }

  async set(items: Record<string, unknown>): Promise<void> {
    return new Promise(resolve => {
      for (const key in items) {
        // In chrome storage, setting undefined values is a no-op
        if (items[key] !== undefined) {
          this.store.set(key, items[key]);
        }
      }
      resolve();
    });
  }

  async clear(): Promise<void> {
    return new Promise(resolve => {
      this.store.clear();
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
  };
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
