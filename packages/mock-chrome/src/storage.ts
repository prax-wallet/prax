import { vi } from 'vitest';
import { MockStorageArea } from './mocks/storage-area';

export const local = new MockStorageArea();
export const session = new MockStorageArea();
export const onChanged: chrome.storage.StorageChangedEvent = {
  addListener: vi.fn(
    (
      listener: (
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: chrome.storage.AreaName,
      ) => void,
    ) => {
      console.debug('MockStorageArea.onChanged.addListener', listener);
      local.onChanged.addListener(changes => listener(changes, 'local'));
      session.onChanged.addListener(changes => listener(changes, 'session'));
    },
  ),

  removeListener: vi.fn(listener => {
    console.debug('MockStorageArea.onChanged.removeListener', listener);
  }),
  hasListener: vi.fn(listener => {
    console.debug('MockStorageArea.onChanged.hasListener', listener);
    throw new Error('Not implemented');
  }),
  hasListeners: vi.fn(() => {
    console.debug('MockStorageArea.onChanged.hasListeners');
    throw new Error('Not implemented');
  }),

  getRules: undefined as never,
  addRules: undefined as never,
  removeRules: undefined as never,
};
