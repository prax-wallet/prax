import { beforeEach, describe, expect, test } from 'vitest';
import { ExtensionStorage } from './base';
import { MockStorageArea } from './mock';

interface MockState {
  dbVersion: number;
  network: string;
  seedPhrase: string | undefined;
  accounts: {
    label: string;
  }[];
  fullSyncHeight: number;
}

describe('Base storage default instantiation', () => {
  let extStorage: ExtensionStorage<MockState>;

  beforeEach(() => {
    const storageArea = new MockStorageArea();
    extStorage = new ExtensionStorage<MockState>({
      storage: storageArea,
      defaults: {
        network: '',
        seedPhrase: undefined,
        accounts: [],
        fullSyncHeight: 0,
      },
      version: { current: 1, migrations: { 0: (state: MockState) => state } },
    });
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
    const version = await extStorage.get('dbVersion');
    expect(version).toBe(1);
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

  test('remove sets value to default when default exists', async () => {
    await extStorage.set('accounts', [{ label: 'Account 1' }]);
    await extStorage.remove('accounts');
    const networkValue = await extStorage.get('accounts');
    expect(networkValue).toStrictEqual([]);
  });

  test('remove removes key when no default exists', async () => {
    await extStorage.set('seedPhrase', 'test seed phrase');
    await extStorage.remove('seedPhrase');
    const seedPhraseValue = await extStorage.get('seedPhrase');
    expect(seedPhraseValue).toBe(undefined);
  });

  test('remove throws error when attempting to remove dbVersion', async () => {
    await expect(extStorage.remove('dbVersion')).rejects.toThrow('Cannot remove dbVersion');
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
