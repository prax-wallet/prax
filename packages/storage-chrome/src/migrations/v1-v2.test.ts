import { beforeEach, describe, expect, test } from 'vitest';
import { ExtensionStorage, ExtensionStorageDefaults } from '../base';
import { MockStorageArea } from '@repo/mock-chrome/mocks/storage-area';
import { VERSION_FIELD } from '../version-field';
import * as Storage_V1 from '../versions/v1';
import * as Storage_V2 from '../versions/v2';
import localV1Migration from './v0-v1';
import localV2Migration from './v1-v2';
import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';

const storageArea = new MockStorageArea();

// tests won't examine these, they are certain to be valid
const requiredData: ExtensionStorageDefaults<Storage_V1.LOCAL> = {
  wallets: [],
  knownSites: [],
  numeraires: [],
};

const validOptionalData: Omit<Storage_V1.LOCAL, 'wallets' | 'knownSites' | 'numeraires'> = {
  grpcEndpoint: 'https://example.net',
  frontendUrl: 'https://example.com',
  passwordKeyPrint: { hash: 'test-hash', salt: 'test-salt' },
  fullSyncHeight: 12345,
  params: new AppParameters({ chainId: 'mock-chain' }).toJsonString(),
};

const legacyItem = <T>(x?: T, version: 'V1' | 'V2' = 'V2'): { version: 'V1' | 'V2'; value?: T } => {
  return { version, value: x };
};

describe('v2 local schema migrations', () => {
  let v2ExtStorage: ExtensionStorage<Storage_V2.LOCAL, Storage_V2.VERSION>;

  beforeEach(() => {
    storageArea.mock.clear();
    v2ExtStorage = new ExtensionStorage<Storage_V2.LOCAL, Storage_V2.VERSION>(
      storageArea,
      requiredData,
      2,
      { 0: localV1Migration, 1: localV2Migration },
    );
  });

  test('passes through valid v1 data unchanged', async () => {
    const validV1Data: Storage_V1.LOCAL = { ...requiredData, ...validOptionalData };
    await storageArea.set({ [VERSION_FIELD]: 1, ...validV1Data });

    const wallets = await v2ExtStorage.get('wallets');
    expect(wallets).toEqual(validV1Data.wallets);

    const knownSites = await v2ExtStorage.get('knownSites');
    expect(knownSites).toEqual(validV1Data.knownSites);

    const numeraires = await v2ExtStorage.get('numeraires');
    expect(numeraires).toEqual(validV1Data.numeraires);

    const grpcEndpoint = await v2ExtStorage.get('grpcEndpoint');
    expect(grpcEndpoint).toEqual(validV1Data.grpcEndpoint);

    const frontendUrl = await v2ExtStorage.get('frontendUrl');
    expect(frontendUrl).toEqual(validV1Data.frontendUrl);

    const passwordKeyPrint = await v2ExtStorage.get('passwordKeyPrint');
    expect(passwordKeyPrint).toEqual(validV1Data.passwordKeyPrint);

    const fullSyncHeight = await v2ExtStorage.get('fullSyncHeight');
    expect(fullSyncHeight).toEqual(validV1Data.fullSyncHeight);

    const params = await v2ExtStorage.get('params');
    expect(params).toEqual(validV1Data.params);

    expect(await storageArea.get(VERSION_FIELD)).toEqual({ [VERSION_FIELD]: 2 });
  });

  test('handles invalid data types (except passwordKeyPrint) by dropping them', async () => {
    const invalidData = {
      ...requiredData,
      grpcEndpoint: 123,
      frontendUrl: true,
      fullSyncHeight: 'not-a-number',
      params: { not: 'a-string' },
    };

    await storageArea.set({ [VERSION_FIELD]: 1, ...invalidData });

    const wallets = await v2ExtStorage.get('wallets');
    expect(wallets).toEqual(invalidData.wallets);

    const knownSites = await v2ExtStorage.get('knownSites');
    expect(knownSites).toEqual(invalidData.knownSites);

    const numeraires = await v2ExtStorage.get('numeraires');
    expect(numeraires).toEqual(invalidData.numeraires);

    const grpcEndpoint = await v2ExtStorage.get('grpcEndpoint');
    expect(grpcEndpoint).toBeUndefined();

    const frontendUrl = await v2ExtStorage.get('frontendUrl');
    expect(frontendUrl).toBeUndefined();

    const fullSyncHeight = await v2ExtStorage.get('fullSyncHeight');
    expect(fullSyncHeight).toBeUndefined();

    const params = await v2ExtStorage.get('params');
    expect(params).toBeUndefined();

    expect(await storageArea.get(VERSION_FIELD)).toEqual({ [VERSION_FIELD]: 2 });
  });

  test('handles vestigial passwordKeyPrint by recovering it', async () => {
    const vestigialData = {
      ...requiredData,
      ...validOptionalData,
      passwordKeyPrint: legacyItem(validOptionalData.passwordKeyPrint),
    };

    await storageArea.set({ [VERSION_FIELD]: 1, ...vestigialData });

    const passwordKeyPrint = await v2ExtStorage.get('passwordKeyPrint');
    expect(passwordKeyPrint).toEqual(validOptionalData.passwordKeyPrint);

    expect(await storageArea.get(VERSION_FIELD)).toEqual({ [VERSION_FIELD]: 2 });
  });

  test('handles invalid passwordKeyPrint by failing', async () => {
    const invalidData = {
      ...requiredData,
      ...validOptionalData,
      passwordKeyPrint: 1,
    };

    await storageArea.set({ [VERSION_FIELD]: 1, ...invalidData });
    await expect(v2ExtStorage.get('passwordKeyPrint')).rejects.toThrow();
  });
});
