import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ExtensionStorage, MigrationFn } from '../base';
import { MockStorageArea } from '@repo/mock-chrome/mocks/storage-area';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type MockV0State = {
  network: string;
  seedPhrase: string;
  accounts: {
    label: string;
    encryptedSeedPhrase: string;
  }[];
  frontend?: string;
  grpcUrl?: string;
  fullSyncHeight: number;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type MockV1State = {
  network: string; // stayed the same
  seedPhrase: string[]; // Changed data structure
  accounts: {
    // label: string; // Removed field
    encryptedSeedPhrase: string; // stayed the same
    viewKey: string; // added new field
  }[];
  frontend: string; // async set value
  grpcUrl: { url: string }; // changes data structure
  fullSyncHeight: number; // Stays the same
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type MockV2State = {
  network: string; // stayed the same
  seedPhrase: string[]; // stayed the same
  accounts: {
    encryptedSeedPhrase: string; // stayed the same
    viewKey: string; // added new field
    spendKey: string; // added new field
  }[];
  frontend: string; // stayed the same
  grpcUrl: { url: string; image: string }; // adds new field within data structure
  fullSyncHeight: string; // only in v3 does it change type
};

const mockV0toV1Migration: MigrationFn<MockV0State, MockV1State> = prev =>
  Promise.resolve([
    1,
    {
      network: prev.network ?? '',
      seedPhrase: prev.seedPhrase?.split(' ') ?? [],
      accounts: (prev.accounts ?? []).map(({ encryptedSeedPhrase }) => ({
        encryptedSeedPhrase,
        viewKey: 'v3-view-key-abc',
        spendKey: 'v3-view-key-xyz',
      })),
      frontend: !prev.frontend ? 'https://pfrontend.void' : prev.frontend,
      grpcUrl: { url: prev.grpcUrl ?? '' },
      fullSyncHeight: prev.fullSyncHeight ?? 0,
    },
  ]);

const mockV1toV2Migration: MigrationFn<MockV1State, MockV2State> = prev =>
  Promise.resolve([
    2,
    {
      network: prev.network ?? '',
      seedPhrase: prev.seedPhrase ?? [],
      accounts:
        prev.accounts?.map(({ encryptedSeedPhrase, viewKey }) => ({
          encryptedSeedPhrase,
          viewKey,
          spendKey: 'v3-spend-key-xyz',
        })) ?? [],
      frontend: prev.frontend ?? 'http://default.com',
      grpcUrl: prev.grpcUrl
        ? { url: prev.grpcUrl.url, image: `${prev.grpcUrl.url}/image` }
        : { url: '', image: '' },
      fullSyncHeight: String(prev.fullSyncHeight ?? 0),
    },
  ]);

const rawStorage = new MockStorageArea();

describe('Storage migrations', () => {
  let v1ExtStorage: ExtensionStorage<MockV1State>;
  let v2ExtStorage: ExtensionStorage<MockV2State>;
  const v2Migrations = {
    0: mockV0toV1Migration,
    1: mockV1toV2Migration,
  };

  beforeEach(() => {
    rawStorage.mock.clear();

    v1ExtStorage = new ExtensionStorage<MockV1State>(
      rawStorage,
      {
        network: '',
        accounts: [],
        seedPhrase: [],
        frontend: 'http://default.com',
        grpcUrl: { url: '' },
        fullSyncHeight: 0,
      },
      { current: 1, migrations: { 0: mockV0toV1Migration } },
    );

    v2ExtStorage = new ExtensionStorage<MockV2State>(
      rawStorage,
      {
        network: '',
        accounts: [],
        seedPhrase: [],
        frontend: 'http://default.com',
        grpcUrl: { url: '', image: '' },
        fullSyncHeight: '0',
      },
      { current: 2, migrations: v2Migrations },
    );
  });

  describe('no migrations available', () => {
    test('defaults work fine', async () => {
      const result = await v2ExtStorage.get('frontend');
      expect(result).toBe('http://default.com');

      await expect(rawStorage.get('dbVersion')).resolves.toStrictEqual({ dbVersion: 2 });
    });

    test('gets work fine', async () => {
      await v1ExtStorage.set('network', 'mainnet');
      const result = await v2ExtStorage.get('network');
      expect(result).toBe('mainnet');
    });
  });

  describe('migrations available', () => {
    test('defaults work fine', async () => {
      await v1ExtStorage.get('seedPhrase');
      await expect(rawStorage.get('dbVersion')).resolves.toStrictEqual({ dbVersion: 1 });

      const result = await v2ExtStorage.get('seedPhrase');
      await expect(rawStorage.get('dbVersion')).resolves.toStrictEqual({ dbVersion: 2 });
      expect(result).toStrictEqual([]);
    });

    test('get works on a changed data structure (one migration step over two versions)', async () => {
      const mock0StorageState: Record<string, unknown> = {
        network: '',
        accounts: [],
        seedPhrase: 'cat dog mouse horse',
        frontend: 'http://default.com',
        grpcUrl: '',
        fullSyncHeight: 0,
      } satisfies MockV0State;

      await rawStorage.set(mock0StorageState);
      await expect(rawStorage.get('dbVersion')).resolves.toStrictEqual({});

      const result = await v2ExtStorage.get('seedPhrase');
      expect(result).toEqual(['cat', 'dog', 'mouse', 'horse']);
      await expect(rawStorage.get('dbVersion')).resolves.toStrictEqual({ dbVersion: 2 });
    });

    test('get works on a changed data structure (two migration steps over two versions)', async () => {
      const mock0StorageState: Record<string, unknown> = {
        network: '',
        accounts: [],
        seedPhrase: 'cat dog mouse horse',
        frontend: 'http://default.com',
        grpcUrl: 'grpc.void.test',
        fullSyncHeight: 0,
      } satisfies MockV0State;

      await rawStorage.set(mock0StorageState);
      await expect(rawStorage.get('dbVersion')).resolves.toStrictEqual({});

      const result = await v2ExtStorage.get('grpcUrl');
      expect(result).toEqual({ url: 'grpc.void.test', image: 'grpc.void.test/image' });
      await expect(rawStorage.get('dbVersion')).resolves.toStrictEqual({ dbVersion: 2 });
    });

    test('get works when there is a migration only at the last step', async () => {
      await v1ExtStorage.set('fullSyncHeight', 123);
      await expect(rawStorage.get('dbVersion')).resolves.toStrictEqual({ dbVersion: 1 });

      const result = await v2ExtStorage.get('fullSyncHeight');
      expect(typeof result).toEqual('string');
      await expect(rawStorage.get('dbVersion')).resolves.toStrictEqual({ dbVersion: 2 });
    });

    test('get works with removed/added fields', async () => {
      const mock0StorageState: Record<string, unknown> = {
        network: '',
        accounts: [{ label: 'account #1', encryptedSeedPhrase: '12345' }],
        seedPhrase: 'cat dog mouse horse',
        frontend: 'http://default.com',
        grpcUrl: 'grpc.void.test',
        fullSyncHeight: 0,
      } satisfies MockV0State;
      await rawStorage.set(mock0StorageState);
      await expect(rawStorage.get('dbVersion')).resolves.toStrictEqual({});

      const result0To2 = await v2ExtStorage.get('accounts');
      expect(result0To2).toEqual([
        {
          encryptedSeedPhrase: '12345',
          viewKey: 'v3-view-key-abc',
          spendKey: 'v3-spend-key-xyz',
        },
      ]);
      await expect(rawStorage.get('dbVersion')).resolves.toStrictEqual({ dbVersion: 2 });
    });

    test('from a different version, the migration is different', async () => {
      // from a different version, the migration is different
      await v1ExtStorage.set('accounts', [
        { viewKey: 'v2-view-key-efg', encryptedSeedPhrase: '12345' },
      ]);
      await expect(rawStorage.get('dbVersion')).resolves.toStrictEqual({ dbVersion: 1 });

      const result1To2 = await v2ExtStorage.get('accounts');
      expect(result1To2).toEqual([
        {
          encryptedSeedPhrase: '12345',
          viewKey: 'v2-view-key-efg',
          spendKey: 'v3-spend-key-xyz',
        },
      ]);
      await expect(rawStorage.get('dbVersion')).resolves.toStrictEqual({ dbVersion: 2 });
    });

    test('multiple get (that may migrate) have no side effects', async () => {
      await v2ExtStorage.set('seedPhrase', ['cat dog mouse horse']);
      const resultA = await v2ExtStorage.get('seedPhrase');
      const resultB = await v2ExtStorage.get('seedPhrase');
      const resultC = await v2ExtStorage.get('seedPhrase');
      expect(resultA).toEqual(resultB);
      expect(resultB).toEqual(resultC);
      expect(resultA).toEqual(resultC);
    });

    test('should handle concurrent migration accesses correctly', async () => {
      await v1ExtStorage.set('fullSyncHeight', 123);

      const migrationSpy = vi.spyOn(v2Migrations, 1);

      // Trigger two concurrent accesses
      const promise1 = v2ExtStorage.get('fullSyncHeight');
      const promise2 = v2ExtStorage.get('fullSyncHeight');
      const promise3 = v2ExtStorage.get('fullSyncHeight');

      // Both should resolve to the same migrated value
      const result1 = await promise1;
      const result2 = await promise2;
      const result3 = await promise3;

      expect(result1).toBe('123');
      expect(result2).toBe('123');
      expect(result3).toBe('123');

      // Ensure the migration function is called only once (properly uses locks)
      expect(migrationSpy).toHaveBeenCalledOnce();
    });

    test('migrating to older step (local dev possibly)', async () => {
      await v2ExtStorage.set('fullSyncHeight', '123');
      await expect(v1ExtStorage.get('fullSyncHeight')).rejects.toThrow(
        'No migration function provided for version: 2',
      );
    });

    test('New field added to type without a migration returns undefined', async () => {
      // @ts-expect-error testing adding a new field
      const result = await v2ExtStorage.get('newField');
      expect(result).toBeUndefined();
    });

    test('error during migration from v0 to v1', async () => {
      const migrationFailure = new Error('bad thing happen');
      const faultyMigration = new ExtensionStorage<MockV1State>(
        rawStorage,
        {
          network: '',
          accounts: [],
          seedPhrase: [],
          frontend: 'http://default.com',
          grpcUrl: { url: '' },
          fullSyncHeight: 0,
        },
        { current: 1, migrations: { 0: () => Promise.reject(migrationFailure) } },
      );

      const mock0StorageState: Record<string, unknown> = {
        network: '',
        accounts: [],
        seedPhrase: 'cat dog mouse horse',
        frontend: 'http://default.com',
        grpcUrl: 'grpc.void.test',
        fullSyncHeight: 0,
      } satisfies MockV0State;
      await rawStorage.set(mock0StorageState);

      await expect(faultyMigration.get('network')).rejects.toThrow(
        `There was an error with migrating the database: ${String(migrationFailure)}`,
      );
    });

    test('error during migration from v1 to v2', async () => {
      const migrationFailure = new Error('good thing happen');
      const mock1Storage = new ExtensionStorage<MockV1State>(
        rawStorage,
        {
          network: '',
          accounts: [],
          seedPhrase: [],
          frontend: 'http://default.com',
          grpcUrl: { url: '' },
          fullSyncHeight: 0,
        },
        { current: 1, migrations: { 0: mockV0toV1Migration } },
      );

      await mock1Storage.set('fullSyncHeight', 123);
      const height = await mock1Storage.get('fullSyncHeight');
      expect(height).toEqual(123);

      const faultyMigration = new ExtensionStorage<MockV2State>(
        rawStorage,
        {
          network: '',
          accounts: [],
          seedPhrase: [],
          frontend: 'http://default.com',
          grpcUrl: { url: '', image: '' },
          fullSyncHeight: '0',
        },
        {
          current: 2,
          migrations: { 0: mockV0toV1Migration, 1: () => Promise.reject(migrationFailure) },
        },
      );

      await expect(faultyMigration.get('network')).rejects.toThrow(
        `There was an error with migrating the database: ${String(migrationFailure)}`,
      );
    });

    test('error during migration propagates to multiple callers', async () => {
      const migrationFailure = new Error('fhqwhgads');
      const originalNetworkVal = 'original.void.zone';
      await rawStorage.set({ network: originalNetworkVal });
      const mock1Storage = new ExtensionStorage<MockV1State>(
        rawStorage,
        {
          network: '',
          accounts: [],
          seedPhrase: [],
          frontend: 'http://default.com',
          grpcUrl: { url: '' },
          fullSyncHeight: 0,
        },
        { current: 1, migrations: { 0: mockV0toV1Migration } },
      );

      await mock1Storage.set('fullSyncHeight', 123);
      const height = await mock1Storage.get('fullSyncHeight');
      expect(height).toEqual(123);

      const faultyMigration = new ExtensionStorage<MockV2State>(
        rawStorage,
        {
          network: '',
          accounts: [],
          seedPhrase: [],
          frontend: 'http://default.com',
          grpcUrl: { url: '', image: '' },
          fullSyncHeight: '0',
        },
        {
          current: 2,
          migrations: { 0: mockV0toV1Migration, 1: () => Promise.reject(migrationFailure) },
        },
      );

      const expectedError = `There was an error with migrating the database: ${String(migrationFailure)}`;

      const callA = faultyMigration.get('network');
      await expect(callA).rejects.toThrow(expectedError);
      const rawValueA = await rawStorage.get('network');
      expect(rawValueA).toStrictEqual({ network: originalNetworkVal });

      const callB = faultyMigration.set('network', 'xyz');
      await expect(callB).rejects.toThrow(expectedError);
      const rawValueB = await rawStorage.get('network');
      expect(rawValueB).toStrictEqual({ network: originalNetworkVal });

      const callC = faultyMigration.get('network');
      await expect(callC).rejects.toThrow(expectedError);
      const rawValueC = await rawStorage.get('network');
      expect(rawValueC).toStrictEqual({ network: originalNetworkVal });

      const callD = faultyMigration.get('accounts');
      await expect(callD).rejects.toThrow(expectedError);
    });
  });
});
