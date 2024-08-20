import { beforeEach, describe, expect, test } from 'vitest';
import { ExtensionStorage, Migrations } from '../base';
import { MockStorageArea } from '../mock';

interface MockV1State {
  network: string;
  seedPhrase: string;
  accounts: {
    label: string;
    encryptedSeedPhrase: string;
  }[];
  frontend: string | undefined;
  grpcUrl: string | undefined;
}

interface MockV2State {
  network: string; // stayed the same
  seedPhrase: string[]; // Changed data structure
  accounts: {
    // label: string; // Removed field
    encryptedSeedPhrase: string; // stayed the same
    viewKey: string; // added new field
  }[];
  frontend: string; // async set value
  grpcUrl: { url: string }; // changes data structure
}

interface MockV3State {
  network: string; // stayed the same
  seedPhrase: string[]; // stayed the same
  accounts: {
    encryptedSeedPhrase: string; // stayed the same
    viewKey: string; // added new field
    spendKey: string; // added new field
  }[];
  frontend: string; // stayed the same
  grpcUrl: { url: string; image: string }; // adds new field within data structure
}

enum MockStorageVersion {
  V1 = 'V1',
  V2 = 'V2',
  V3 = 'V3',
}

const v2Migrations: Migrations<MockV2State> = {
  [MockStorageVersion.V1]: {
    seedPhrase: (old: MockV1State['seedPhrase']): MockV2State['seedPhrase'] => old.split(' '),
    accounts: (old: MockV1State['accounts']): MockV2State['accounts'] =>
      old.map(({ encryptedSeedPhrase }) => {
        return {
          encryptedSeedPhrase,
          viewKey: 'v3-view-key-abc',
          spendKey: 'v3-view-key-xyz',
        };
      }),
    frontend: async (old: MockV1State['frontend']): Promise<MockV2State['frontend']> => {
      await new Promise(resolve => setTimeout(resolve, 0));
      return !old ? 'https://pfrontend.void' : old;
    },
    grpcUrl: (old: MockV1State['grpcUrl']): MockV2State['grpcUrl'] => {
      return { url: old ?? '' };
    },
  },
};

const v3Migrations: Migrations<MockV3State> = {
  ...v2Migrations,
  [MockStorageVersion.V2]: {
    accounts: (old: MockV2State['accounts']): MockV3State['accounts'] => {
      return old.map(({ encryptedSeedPhrase, viewKey }) => {
        return {
          encryptedSeedPhrase,
          viewKey,
          spendKey: 'v3-spend-key-xyz',
        };
      });
    },
    grpcUrl: (old: MockV2State['grpcUrl']): MockV3State['grpcUrl'] => {
      return { url: old.url, image: `${old.url}/image` };
    },
  },
};

describe('Storage migrations', () => {
  let v1ExtStorage: ExtensionStorage<MockV1State>;
  let v2ExtStorage: ExtensionStorage<MockV2State>;
  let v3ExtStorage: ExtensionStorage<MockV3State>;

  beforeEach(() => {
    const storageArea = new MockStorageArea();
    v1ExtStorage = new ExtensionStorage<MockV1State>(
      storageArea,
      {
        network: '',
        seedPhrase: '',
        accounts: [],
        frontend: undefined,
        grpcUrl: undefined,
      },
      MockStorageVersion.V1,
    );
    v2ExtStorage = new ExtensionStorage<MockV2State>(
      storageArea,
      {
        network: '',
        accounts: [],
        seedPhrase: [],
        frontend: 'http://default.com',
        grpcUrl: { url: '' },
      },
      MockStorageVersion.V2,
      v2Migrations,
      {
        [MockStorageVersion.V1]: MockStorageVersion.V2,
      },
    );
    v3ExtStorage = new ExtensionStorage<MockV3State>(
      storageArea,
      {
        network: '',
        accounts: [],
        seedPhrase: [],
        frontend: 'http://default.com',
        grpcUrl: { url: '', image: '' },
      },
      MockStorageVersion.V3,
      v3Migrations,
      {
        [MockStorageVersion.V1]: MockStorageVersion.V2,
        [MockStorageVersion.V2]: MockStorageVersion.V3,
      },
    );
  });

  describe('no migrations available', () => {
    test('defaults work fine', async () => {
      const result = await v3ExtStorage.get('frontend');
      expect(result).toBe('http://default.com');
    });

    test('gets work fine', async () => {
      await v1ExtStorage.set('network', 'mainnet');
      const result = await v3ExtStorage.get('network');
      expect(result).toBe('mainnet');
    });
  });

  describe('migrations available', () => {
    test('defaults work fine', async () => {
      await v1ExtStorage.get('seedPhrase');
      const result = await v3ExtStorage.get('seedPhrase');
      expect(result).toStrictEqual([]);
    });

    test('get works on a changed data structure (one migration step over two versions)', async () => {
      await v1ExtStorage.set('seedPhrase', 'cat dog mouse horse');
      const result = await v3ExtStorage.get('seedPhrase');
      expect(result).toEqual(['cat', 'dog', 'mouse', 'horse']);
    });

    test('get works on a changed data structure (two migration steps over two versions)', async () => {
      await v1ExtStorage.set('grpcUrl', 'grpc.void.test');
      const result = await v3ExtStorage.get('grpcUrl');
      expect(result).toEqual({ url: 'grpc.void.test', image: 'grpc.void.test/image' });
    });

    test('get works with removed/added fields', async () => {
      await v1ExtStorage.set('accounts', [{ label: 'account #1', encryptedSeedPhrase: '12345' }]);
      const result1To3 = await v3ExtStorage.get('accounts');
      expect(result1To3).toEqual([
        {
          encryptedSeedPhrase: '12345',
          viewKey: 'v3-view-key-abc',
          spendKey: 'v3-spend-key-xyz',
        },
      ]);

      // from a different version, the migration is different
      await v2ExtStorage.set('accounts', [
        { viewKey: 'v2-view-key-efg', encryptedSeedPhrase: '12345' },
      ]);
      const result2To3 = await v3ExtStorage.get('accounts');
      expect(result2To3).toEqual([
        {
          encryptedSeedPhrase: '12345',
          viewKey: 'v2-view-key-efg',
          spendKey: 'v3-spend-key-xyz',
        },
      ]);
    });

    test('multiple get (that may migrate) have no side effects', async () => {
      await v1ExtStorage.set('seedPhrase', 'cat dog mouse horse');
      const resultA = await v3ExtStorage.get('seedPhrase');
      const resultB = await v3ExtStorage.get('seedPhrase');
      const resultC = await v3ExtStorage.get('seedPhrase');
      expect(resultA).toEqual(resultB);
      expect(resultB).toEqual(resultC);
      expect(resultA).toEqual(resultC);
    });

    describe('async migrations', () => {
      test('work with override', async () => {
        await v1ExtStorage.set('frontend', undefined);
        const result = await v3ExtStorage.get('frontend');
        expect(result).toEqual('https://pfrontend.void');
      });

      test('work bringing over old', async () => {
        await v1ExtStorage.set('frontend', 'http://mysite.com');
        const result = await v3ExtStorage.get('frontend');
        expect(result).toEqual('http://mysite.com');
      });
    });
  });
});
