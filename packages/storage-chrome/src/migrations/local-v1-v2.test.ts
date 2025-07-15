import { Key, KeyPrint } from '@penumbra-zone/crypto-web/encryption';
import { generateSeedPhrase } from '@penumbra-zone/crypto-web/mnemonic';
import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { Wallet } from '@penumbra-zone/types/wallet';
import { generateSpendKey, getFullViewingKey, getWalletId } from '@penumbra-zone/wasm/keys';
import { MockStorageArea } from '@repo/mock-chrome/mocks/storage-area';
import { beforeEach, describe, expect, test } from 'vitest';
import { ExtensionStorage, ExtensionStorageDefaults } from '../base';
import { VERSION_FIELD } from '../version-field';
import * as Storage_V1 from '../versions/v1';
import * as Storage_V2 from '../versions/v2';
import local_v0_v1 from './local-v0-v1';
import local_v1_v2 from './local-v1-v2';

const testPassword = 'test-password-12345';
const testSeedPhrase = generateSeedPhrase(12).join(' ');
const testFvk = getFullViewingKey(generateSpendKey(testSeedPhrase));
const testId = getWalletId(testFvk);
const testKey = await Key.create(testPassword);
const testWallet = new Wallet('Test Wallet', testId.toJsonString(), testFvk.toJsonString(), {
  encryptedSeedPhrase: await testKey.key.seal(testSeedPhrase),
});

const requiredData: ExtensionStorageDefaults<Storage_V1.LOCAL> = {
  wallets: [],
  knownSites: [],
  numeraires: [],
};

const validOptionalData: Omit<Storage_V1.LOCAL, 'wallets' | 'knownSites' | 'numeraires'> = {
  grpcEndpoint: 'https://example.net',
  frontendUrl: 'https://example.com',
  fullSyncHeight: 12345,
  params: new AppParameters({ chainId: 'mock-chain' }).toJsonString(),
};

const invalidOptionalData = {
  grpcEndpoint: 123,
  frontendUrl: true,
  fullSyncHeight: 'not-a-number',
  params: { not: 'a-string' },
};

const asLegacyItem = <T>(
  value?: T,
  version: 'V1' | 'V2' = 'V2',
): { version: 'V1' | 'V2'; value?: T } => ({ version, value });

const storageArea = new MockStorageArea();

describe('v2 local schema migrations', () => {
  let v2ExtStorage: ExtensionStorage<Storage_V2.LOCAL, Storage_V2.VERSION>;

  beforeEach(() => {
    storageArea.mock.clear();
    v2ExtStorage = new ExtensionStorage<Storage_V2.LOCAL, Storage_V2.VERSION>(
      storageArea,
      requiredData,
      2,
      { 0: local_v0_v1, 1: local_v1_v2 },
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

    const fullSyncHeight = await v2ExtStorage.get('fullSyncHeight');
    expect(fullSyncHeight).toEqual(validV1Data.fullSyncHeight);

    const params = await v2ExtStorage.get('params');
    expect(params).toEqual(validV1Data.params);

    expect(await storageArea.get(VERSION_FIELD)).toEqual({ [VERSION_FIELD]: 2 });
  });

  test('handles invalid optional data (except passwordKeyPrint) by dropping it', async () => {
    const badData = {
      ...requiredData,
      ...validOptionalData,
      ...invalidOptionalData,
    };

    await storageArea.set({ [VERSION_FIELD]: 1, ...badData });

    const wallets = await v2ExtStorage.get('wallets');
    expect(wallets).toEqual(badData.wallets);

    const knownSites = await v2ExtStorage.get('knownSites');
    expect(knownSites).toEqual(badData.knownSites);

    const numeraires = await v2ExtStorage.get('numeraires');
    expect(numeraires).toEqual(badData.numeraires);

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

  test('migrated data unseals to reveal the original seed phrase', async () => {
    await storageArea.set({
      [VERSION_FIELD]: 1,
      ...requiredData,
      ...validOptionalData,
      passwordKeyPrint: testKey.keyPrint.toJson(),
      wallets: [testWallet.toJson()],
    });

    const wallets = await v2ExtStorage.get('wallets');
    const passwordKeyPrint = await v2ExtStorage.get('passwordKeyPrint');

    const migratedKeyPrint = KeyPrint.fromJson(passwordKeyPrint!);
    const recreatedKey = await Key.recreate(testPassword, migratedKeyPrint);

    expect(wallets[0]).toStrictEqual(testWallet.toJson());

    const walletFromJson = Wallet.fromJson(wallets[0]!);
    const decryptedSeedPhrase = await recreatedKey!.unseal(
      walletFromJson.custody.encryptedSeedPhrase,
    );
    expect(decryptedSeedPhrase).toBe(testSeedPhrase);

    expect(await storageArea.get(VERSION_FIELD)).toEqual({ [VERSION_FIELD]: 2 });
  });

  test('migrated data with vestigial passwordKeyPrint unseals to reveal the original seed phrase', async () => {
    const corruptedData = {
      ...requiredData,
      ...validOptionalData,
      passwordKeyPrint: asLegacyItem(testKey.keyPrint.toJson()),
      wallets: [testWallet.toJson()],
    };

    await storageArea.set({
      [VERSION_FIELD]: 1,
      ...corruptedData,
    });

    const wallets = await v2ExtStorage.get('wallets');
    const passwordKeyPrint = await v2ExtStorage.get('passwordKeyPrint');

    const migratedKeyPrint = KeyPrint.fromJson(passwordKeyPrint!);
    const recreatedKey = await Key.recreate(testPassword, migratedKeyPrint);

    expect(wallets[0]).toStrictEqual(testWallet.toJson());

    const walletFromJson = Wallet.fromJson(wallets[0]!);
    const decryptedSeedPhrase = await recreatedKey!.unseal(
      walletFromJson.custody.encryptedSeedPhrase,
    );

    expect(decryptedSeedPhrase).toBe(testSeedPhrase);
  });
});
