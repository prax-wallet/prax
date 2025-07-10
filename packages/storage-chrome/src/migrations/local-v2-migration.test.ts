import { beforeEach, describe, expect, test } from 'vitest';
import { ExtensionStorage } from '../base';
import { MockStorageArea } from '@repo/mock-chrome/mocks/storage-area';
import { VERSION_FIELD } from '../version-field';
import * as Storage_V1 from '../versions/v1';
import * as Storage_V2 from '../versions/v2';
import * as Storage_V0 from '../versions/v0';
import localV1Migration from './local-v1-migration';
import localV2Migration from './local-v2-migration';

type DirtyState = Partial<{
  [K in keyof Storage_V0.LOCAL | keyof Storage_V1.LOCAL]: K extends keyof Storage_V0.LOCAL
    ? Storage_V0.LOCAL[K] | Storage_V1.LOCAL[K]
    : Storage_V1.LOCAL[K];
}>;

const storageArea = new MockStorageArea();

describe('v2 local schema migrations', () => {
  let v2ExtStorage: ExtensionStorage<Storage_V2.LOCAL, Storage_V2.VERSION>;

  beforeEach(() => {
    storageArea.mock.clear();
    v2ExtStorage = new ExtensionStorage<Storage_V2.LOCAL, Storage_V2.VERSION>(
      storageArea,
      { wallets: [], knownSites: [], numeraires: [] },
      2,
      { 0: localV1Migration, 1: localV2Migration },
    );
  });

  test('migrates complete vestigial data from v1 to v2', async () => {
    const grpcEndpointVal = 'https://example.net';
    const frontendUrlVal = 'https://example.com';
    const passwordKeyPrintVal = { hash: 'xyz', salt: 'abc' };
    const fullSyncHeightVal = 13524524;
    const paramsVal = JSON.stringify({ chainId: 'penumbra-1' });

    const mock1StorageState: DirtyState = {
      wallets: [
        {
          fullViewingKey: 'test-fvk',
          label: 'Wallet 1',
          id: 'test-wallet-id',
          custody: { encryptedSeedPhrase: { nonce: '', cipherText: '' } },
        },
      ],
      knownSites: [{ origin: 'google.com', choice: 'Approved', date: 12342342 }],
      numeraires: ['asset1', 'asset2'],
      // Vestigial fields from v0
      grpcEndpoint: { version: 'V1', value: grpcEndpointVal },
      frontendUrl: { version: 'V1', value: frontendUrlVal },
      passwordKeyPrint: { version: 'V1', value: passwordKeyPrintVal },
      fullSyncHeight: { version: 'V1', value: fullSyncHeightVal },
      params: { version: 'V1', value: paramsVal },
    };

    await storageArea.set({ [VERSION_FIELD]: 1, ...mock1StorageState });

    const wallets = await v2ExtStorage.get('wallets');
    expect(wallets).toEqual([
      {
        fullViewingKey: 'test-fvk',
        label: 'Wallet 1',
        id: 'test-wallet-id',
        custody: { encryptedSeedPhrase: { nonce: '', cipherText: '' } },
      },
    ]);

    const knownSites = await v2ExtStorage.get('knownSites');
    expect(knownSites).toEqual([{ origin: 'google.com', choice: 'Approved', date: 12342342 }]);

    const numeraires = await v2ExtStorage.get('numeraires');
    expect(numeraires).toEqual(['asset1', 'asset2']);

    const grpcEndpoint = await v2ExtStorage.get('grpcEndpoint');
    expect(grpcEndpoint).toEqual(grpcEndpointVal);

    const frontendUrl = await v2ExtStorage.get('frontendUrl');
    expect(frontendUrl).toEqual(frontendUrlVal);

    const passwordKeyPrint = await v2ExtStorage.get('passwordKeyPrint');
    expect(passwordKeyPrint).toEqual(passwordKeyPrintVal);

    const fullSyncHeight = await v2ExtStorage.get('fullSyncHeight');
    expect(fullSyncHeight).toEqual(fullSyncHeightVal);

    const params = await v2ExtStorage.get('params');
    expect(params).toEqual(paramsVal);
  });

  test('migrates partial vestigial data from v1 to v2', async () => {
    const grpcEndpointVal = 'https://example.net';
    const fullSyncHeightVal = 13524524;

    const mock1StorageState: DirtyState = {
      wallets: [],
      knownSites: [],
      numeraires: [],
      // Only some vestigial fields from v0
      grpcEndpoint: { version: 'V2', value: grpcEndpointVal },
      fullSyncHeight: { version: 'V1', value: fullSyncHeightVal },
    };

    await storageArea.set({ [VERSION_FIELD]: 1, ...mock1StorageState });

    const grpcEndpoint = await v2ExtStorage.get('grpcEndpoint');
    expect(grpcEndpoint).toEqual(grpcEndpointVal);

    const fullSyncHeight = await v2ExtStorage.get('fullSyncHeight');
    expect(fullSyncHeight).toEqual(fullSyncHeightVal);

    const frontendUrl = await v2ExtStorage.get('frontendUrl');
    expect(frontendUrl).toBeUndefined();

    const passwordKeyPrint = await v2ExtStorage.get('passwordKeyPrint');
    expect(passwordKeyPrint).toBeUndefined();

    const params = await v2ExtStorage.get('params');
    expect(params).toBeUndefined();
  });

  test('migrates clean v1 data without vestigial fields', async () => {
    const mock1StorageState: Partial<Storage_V1.LOCAL> = {
      wallets: [
        {
          fullViewingKey: 'test-fvk',
          label: 'Wallet 1',
          id: 'test-wallet-id',
          custody: { encryptedSeedPhrase: { nonce: '', cipherText: '' } },
        },
      ],
      knownSites: [{ origin: 'google.com', choice: 'Approved', date: 12342342 }],
      numeraires: ['asset1', 'asset2'],
    };

    await storageArea.set({ [VERSION_FIELD]: 1, ...mock1StorageState });

    const wallets = await v2ExtStorage.get('wallets');
    expect(wallets).toEqual([
      {
        fullViewingKey: 'test-fvk',
        label: 'Wallet 1',
        id: 'test-wallet-id',
        custody: { encryptedSeedPhrase: { nonce: '', cipherText: '' } },
      },
    ]);

    const knownSites = await v2ExtStorage.get('knownSites');
    expect(knownSites).toEqual([{ origin: 'google.com', choice: 'Approved', date: 12342342 }]);

    const numeraires = await v2ExtStorage.get('numeraires');
    expect(numeraires).toEqual(['asset1', 'asset2']);

    const grpcEndpoint = await v2ExtStorage.get('grpcEndpoint');
    expect(grpcEndpoint).toBeUndefined();

    const frontendUrl = await v2ExtStorage.get('frontendUrl');
    expect(frontendUrl).toBeUndefined();

    const passwordKeyPrint = await v2ExtStorage.get('passwordKeyPrint');
    expect(passwordKeyPrint).toBeUndefined();

    const fullSyncHeight = await v2ExtStorage.get('fullSyncHeight');
    expect(fullSyncHeight).toBeUndefined();

    const params = await v2ExtStorage.get('params');
    expect(params).toBeUndefined();
  });

  test('handles empty v1 data', async () => {
    const mock1StorageState: Partial<Storage_V1.LOCAL> = {};

    await storageArea.set({ [VERSION_FIELD]: 1, ...mock1StorageState });

    const wallets = await v2ExtStorage.get('wallets');
    expect(wallets).toEqual([]);

    const knownSites = await v2ExtStorage.get('knownSites');
    expect(knownSites).toEqual([]);

    const numeraires = await v2ExtStorage.get('numeraires');
    expect(numeraires).toEqual([]);
  });

  test("doesn't migrate unknown fields", async () => {
    const mock1StorageState: DirtyState = {
      wallets: [],
      knownSites: [],
      numeraires: [],
      // Unknown vestigial field
      unknownField: { version: 'V1', value: 'some-value' },
    } as never;

    await storageArea.set({ [VERSION_FIELD]: 1, ...mock1StorageState });

    await v2ExtStorage.get('wallets');

    const unknownField = await v2ExtStorage.get('unknownField' as never);
    expect(unknownField).toBeUndefined();
  });

  test('does not destroy non-vestigial fields', async () => {
    const mock1StorageState: DirtyState = {
      wallets: [],
      knownSites: [],
      numeraires: [],
      // Non-vestigial field (not wrapped in version object)
      grpcEndpoint: 'https://example.net',
    };

    await storageArea.set({ [VERSION_FIELD]: 1, ...mock1StorageState });

    const grpcEndpoint = await v2ExtStorage.get('grpcEndpoint');
    expect(grpcEndpoint).toBe(mock1StorageState.grpcEndpoint);
  });

  test('handles vestigial fields with null/undefined values', async () => {
    const mock1StorageState: DirtyState = {
      wallets: [],
      knownSites: [],
      numeraires: [],
      grpcEndpoint: { version: 'V1', value: null as never },
      // Vestigial field with undefined value
      frontendUrl: { version: 'V1', value: undefined },
    };

    await storageArea.set({ [VERSION_FIELD]: 1, ...mock1StorageState });

    const frontendUrl = await v2ExtStorage.get('frontendUrl');
    expect(frontendUrl).toBeUndefined();

    const grpcEndpoint = await v2ExtStorage.get('grpcEndpoint');
    expect(grpcEndpoint).toBeUndefined();
  });

  test('handles vestigial fields with V2 version', async () => {
    const grpcEndpointVal = 'https://example.net';
    const frontendUrlVal = 'https://example.com';

    const mock1StorageState = {
      wallets: [],
      knownSites: [],
      numeraires: [],
      // Vestigial fields with V2 version
      grpcEndpoint: { version: 'V2', value: grpcEndpointVal },
      frontendUrl: { version: 'V2', value: frontendUrlVal },
    };

    await storageArea.set({ [VERSION_FIELD]: 1, ...mock1StorageState });

    const grpcEndpoint = await v2ExtStorage.get('grpcEndpoint');
    expect(grpcEndpoint).toEqual(grpcEndpointVal);

    const frontendUrl = await v2ExtStorage.get('frontendUrl');
    expect(frontendUrl).toEqual(frontendUrlVal);
  });

  describe('handles vestigial field structures', () => {
    test('throws on future version', async () => {
      const mock1StorageState: DirtyState = {
        wallets: [],
        knownSites: [],
        numeraires: [],
        // Invalid vestigial field - invalid version
        frontendUrl: { version: 'V3' as never, value: 'https://example.com' },
      };

      await storageArea.set({ [VERSION_FIELD]: 1, ...mock1StorageState } as never);

      await expect(() => v2ExtStorage.get('frontendUrl')).rejects.toThrow(
        'Failed to migrate storage: RangeError: Unknown vestigial field version: V3',
      );
    });

    test('handles absent value or absent version properly', async () => {
      const mock1StorageState: DirtyState = {
        wallets: [],
        knownSites: [],
        numeraires: [],
        // Not a vestigial field - no version
        grpcEndpoint: { value: 'https://example.net' } as never,
        // Valid vestigial field - undefined value
        passwordKeyPrint: { version: 'V1' },
      };

      await storageArea.set({ [VERSION_FIELD]: 1, ...mock1StorageState } as never);

      // not changed
      const grpcEndpoint = await v2ExtStorage.get('grpcEndpoint');
      expect(grpcEndpoint).toEqual({ value: 'https://example.net' });

      // migrates to undefined
      const passwordKeyPrint = await v2ExtStorage.get('passwordKeyPrint');
      expect(passwordKeyPrint).toBeUndefined();
    });
  });

  test('handles mixed vestigial and non-vestigial fields', async () => {
    const grpcEndpointVal = 'https://example.net';
    const frontendUrlVal = 'https://example.com';

    const mock1StorageState = {
      wallets: [],
      knownSites: [],
      numeraires: [],
      // Non-vestigial field
      frontendUrl: frontendUrlVal,
      // Vestigial fields
      grpcEndpoint: { version: 'V1', value: grpcEndpointVal },
      fullSyncHeight: { version: 'V2', value: 12345 },
      passwordKeyPrint: { version: 'V1', value: { hash: 'test-hash', salt: 'test-salt' } },
    };

    await storageArea.set({ [VERSION_FIELD]: 1, ...mock1StorageState });

    const grpcEndpoint = await v2ExtStorage.get('grpcEndpoint');
    expect(grpcEndpoint).toEqual(grpcEndpointVal);

    const frontendUrl = await v2ExtStorage.get('frontendUrl');
    expect(frontendUrl).toEqual(frontendUrlVal);

    const fullSyncHeight = await v2ExtStorage.get('fullSyncHeight');
    expect(fullSyncHeight).toEqual(12345);

    const passwordKeyPrint = await v2ExtStorage.get('passwordKeyPrint');
    expect(passwordKeyPrint).toEqual({ hash: 'test-hash', salt: 'test-salt' });
  });
});

describe('v2 migration transform function', () => {
  test('transforms data correctly', () => {
    const grpcEndpointVal = 'https://example.net';
    const frontendUrlVal = 'https://example.com';
    const passwordKeyPrintVal = { hash: 'xyz', salt: 'abc' };
    const fullSyncHeightVal = 13524524;
    const paramsVal = JSON.stringify({ chainId: 'penumbra-1' });

    const mockDirtyState = {
      wallets: [
        {
          fullViewingKey: 'test-fvk',
          label: 'Wallet 1',
          id: 'test-wallet-id',
          custody: { encryptedSeedPhrase: { nonce: '', cipherText: '' } },
        },
      ],
      knownSites: [{ origin: 'google.com', choice: 'Approved', date: 12342342 }],
      numeraires: ['asset1', 'asset2'],
      grpcEndpoint: { version: 'V1', value: grpcEndpointVal },
      frontendUrl: { version: 'V1', value: frontendUrlVal },
      passwordKeyPrint: { version: 'V1', value: passwordKeyPrintVal },
      fullSyncHeight: { version: 'V1', value: fullSyncHeightVal },
      params: { version: 'V1', value: paramsVal },
    };

    const result = localV2Migration.transform(mockDirtyState as never);

    expect(result).toEqual({
      wallets: [
        {
          fullViewingKey: 'test-fvk',
          label: 'Wallet 1',
          id: 'test-wallet-id',
          custody: { encryptedSeedPhrase: { nonce: '', cipherText: '' } },
        },
      ],
      knownSites: [{ origin: 'google.com', choice: 'Approved', date: 12342342 }],
      numeraires: ['asset1', 'asset2'],
      grpcEndpoint: grpcEndpointVal,
      frontendUrl: frontendUrlVal,
      passwordKeyPrint: passwordKeyPrintVal,
      fullSyncHeight: fullSyncHeightVal,
      params: paramsVal,
    });
  });

  test('handles missing required fields by inserting fallback values', () => {
    const mockDirtyState = {
      grpcEndpoint: { version: 'V1', value: 'https://example.net' },
    };

    const result = localV2Migration.transform(mockDirtyState as never);

    expect(result).toEqual({
      wallets: [],
      knownSites: [],
      numeraires: [],
      grpcEndpoint: 'https://example.net',
    });
  });
});
