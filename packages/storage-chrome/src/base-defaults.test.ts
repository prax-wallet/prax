import { beforeEach, describe, expect, test } from 'vitest';
import { ExtensionStorage } from './base';
import { MockStorageArea } from '@repo/mock-chrome/mocks/storage-area';
import { VERSION_FIELD } from './version-field';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type MockState = {
  network: string;
  seedPhrase?: string;
  accounts: {
    label: string;
  }[];
  fullSyncHeight?: number;
};

describe('Base storage default instantiation', () => {
  let extStorage: ExtensionStorage<MockState>;
  let storageArea: MockStorageArea;

  beforeEach(async () => {
    storageArea = new MockStorageArea();
    await storageArea.set({ fullSyncHeight: 0 });
    extStorage = new ExtensionStorage(
      storageArea,
      {
        network: '',
        accounts: [],
      },
      1,
      { 0: { version: () => 1, transform: state => state } },
    );
  });

  test('first get made initializes defaults', async () => {
    const networkDefault = await extStorage.get('network');
    expect(networkDefault).toBe('');

    const seedPhraseDefault = await extStorage.get('seedPhrase');
    expect(seedPhraseDefault).toBe(undefined);

    const accountsDefault = await extStorage.get('accounts');
    expect(accountsDefault).toStrictEqual([]);

    const syncHeightDefault = await extStorage.get('fullSyncHeight');
    expect(syncHeightDefault).toBe(0);
  });

  test('first get made initializes version', async () => {
    await expect(extStorage.get('network')).resolves.toBe('');
    await expect(storageArea.get(VERSION_FIELD)).resolves.toStrictEqual({ [VERSION_FIELD]: 1 });
  });

  test('should handle concurrent initializations w/ locks', async () => {
    const promise1 = extStorage.get('fullSyncHeight');
    const promise2 = extStorage.set('fullSyncHeight', 123);
    const promise3 = extStorage.get('fullSyncHeight');

    // Both should resolve to the same migrated value
    const result1 = await promise1;
    await promise2;
    const result3 = await promise3;

    expect(result1).toBe(0);
    expect(result3).toBe(123);
  });

  test('remove removes key when default exists, and get returns the default', async () => {
    await extStorage.set('accounts', [{ label: 'Account 1' }]);
    await extStorage.remove('accounts');
    const accountsValue = await extStorage.get('accounts');
    expect(accountsValue).toStrictEqual([]);
  });

  test('remove removes key when no default exists', async () => {
    await extStorage.set('seedPhrase', 'test seed phrase');
    await extStorage.remove('seedPhrase');
    const seedPhraseValue = await extStorage.get('seedPhrase');
    expect(seedPhraseValue).toBe(undefined);
  });

  test('get throws error when attempting to get version field', async () => {
    await expect(extStorage.get(VERSION_FIELD as never)).rejects.toThrow(
      `Storage key ${VERSION_FIELD} is reserved`,
    );
  });

  test('set throws error when attempting to set version field', async () => {
    await expect(extStorage.set(VERSION_FIELD as never, 69 as never)).rejects.toThrow(
      `Storage key ${VERSION_FIELD} is reserved`,
    );
  });

  test('remove throws error when attempting to remove version field', async () => {
    await expect(extStorage.remove(VERSION_FIELD as never)).rejects.toThrow(
      `Storage key ${VERSION_FIELD} is reserved`,
    );
  });

  test('remove maintains concurrency and locks', async () => {
    const promise1 = extStorage.remove('network');
    const promise2 = extStorage.set('network', 'testnet');
    const promise3 = extStorage.get('network');

    await promise1;
    await promise2;
    const networkValue = await promise3;

    expect(networkValue).toBe('testnet');
  });

  test('set throws TypeError for no-op values', async () => {
    await expect(extStorage.set('fullSyncHeight', undefined)).rejects.toThrow(TypeError);
    await expect(extStorage.set('fullSyncHeight', NaN)).rejects.toThrow(TypeError);
    await expect(extStorage.set('fullSyncHeight', Infinity)).rejects.toThrow(TypeError);
    await expect(extStorage.set('fullSyncHeight', -Infinity)).rejects.toThrow(TypeError);
  });
});
