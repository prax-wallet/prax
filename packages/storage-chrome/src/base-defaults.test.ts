import { beforeEach, describe, expect, test } from 'vitest';
import { ExtensionStorage } from './base';
import { MockStorageArea } from '@repo/mock-chrome/mocks/storage-area';

const rawStorage = new MockStorageArea();

describe('Base storage default instantiation', () => {
  let extStorage: ExtensionStorage<{
    network: string;
    seedPhrase?: string;
    accounts: {
      label: string;
    }[];
    fullSyncHeight: number;
  }>;

  beforeEach(() => {
    rawStorage.mock.clear();
    extStorage = new ExtensionStorage(
      rawStorage,
      {
        network: '',
        accounts: [],
        fullSyncHeight: 0,
      },
      { current: 1, migrations: { 0: state => Promise.resolve([1, state]) } },
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
    expect(rawStorage.mock.size).toBe(0);
    await expect(extStorage.get('network')).resolves.toBe('');
    await expect(rawStorage.get('dbVersion')).resolves.toStrictEqual({ dbVersion: 1 });
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

  test('get throws error when attempting to get dbVersion', async () => {
    await expect(extStorage.get('dbVersion' as never)).rejects.toThrow('Cannot get dbVersion');
  });

  test('set throws error when attempting to set dbVersion', async () => {
    await expect(extStorage.set('dbVersion' as never, 69 as never)).rejects.toThrow(
      'Cannot set dbVersion',
    );
  });

  test('remove throws error when attempting to remove dbVersion', async () => {
    await expect(extStorage.remove('dbVersion' as never)).rejects.toThrow(
      'Cannot remove dbVersion',
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
});
