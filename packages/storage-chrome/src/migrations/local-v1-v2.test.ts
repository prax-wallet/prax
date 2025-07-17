import { Key, KeyPrint } from '@penumbra-zone/crypto-web/encryption';
import { generateSeedPhrase } from '@penumbra-zone/crypto-web/mnemonic';
import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { Wallet } from '@penumbra-zone/types/wallet';
import { generateSpendKey, getFullViewingKey, getWalletId } from '@penumbra-zone/wasm/keys';
import { MockStorageArea } from '@repo/mock-chrome/mocks/storage-area';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
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

const defaultData: ExtensionStorageDefaults<Storage_V1.LOCAL> = {
  wallets: [],
  knownSites: [],
  numeraires: [],
};

const validRequiredData: Storage_V1.LOCAL = {
  wallets: [],
  knownSites: [{ origin: 'https://example.com', choice: 'Approved', date: 1312 }],
  numeraires: [new AssetId({ inner: new Uint8Array(1) }).toJsonString()],
};

const onboardedData: Pick<Storage_V1.LOCAL, 'wallets' | 'passwordKeyPrint'> = {
  wallets: [testWallet.toJson()],
  passwordKeyPrint: testKey.keyPrint.toJson(),
};

const validOptionalData: Omit<Storage_V1.LOCAL, 'wallets' | 'knownSites' | 'numeraires'> = {
  grpcEndpoint: 'https://example.net',
  frontendUrl: 'https://example.com',
  fullSyncHeight: 12345,
  params: new AppParameters({ chainId: 'mock-chain' }).toJsonString(),
};

const invalidOptionalData: Omit<Storage_V1.LOCAL, 'wallets' | 'knownSites' | 'numeraires'> = {
  grpcEndpoint: 123,
  frontendUrl: true,
  fullSyncHeight: 'not-a-number',
  params: { not: 'a-string' },
  walletCreationBlockHeight: null,
} as never;

const asLegacyItem = <T>(
  value?: T,
  version: 'V1' | 'V2' = 'V2',
): { version: 'V1' | 'V2'; value?: T } => ({ version, value });

const storageArea = new MockStorageArea();
let v2ExtStorage: ExtensionStorage<Storage_V2.LOCAL, Storage_V2.VERSION>;

describe('local-v1-v2 migration', () => {
  beforeEach(async () => {
    await storageArea.clear();

    v2ExtStorage = new ExtensionStorage<Storage_V2.LOCAL, Storage_V2.VERSION>(
      storageArea,
      defaultData,
      2,
      { 0: local_v0_v1, 1: local_v1_v2 },
    );
  });

  afterEach(() => expect(storageArea.mock.get(VERSION_FIELD)).toBe(2));

  describe('required data is unchanged', () => {
    test('valid required data is unchanged', async () => {
      await storageArea.set({
        [VERSION_FIELD]: 1,
        ...validRequiredData,
      });

      const wallets = await v2ExtStorage.get('wallets');
      expect(wallets).toEqual(validRequiredData.wallets);

      const knownSites = await v2ExtStorage.get('knownSites');
      expect(knownSites).toEqual(validRequiredData.knownSites);

      const numeraires = await v2ExtStorage.get('numeraires');
      expect(numeraires).toEqual(validRequiredData.numeraires);
    });

    test('corrupted required data is unchanged', async () => {
      const corruptedRequiredData = {
        wallets: asLegacyItem(validRequiredData.wallets),
        knownSites: asLegacyItem(validRequiredData.knownSites),
        numeraires: asLegacyItem(validRequiredData.numeraires),
      };

      await storageArea.set({
        [VERSION_FIELD]: 1,
        ...corruptedRequiredData,
      });

      const wallets = await v2ExtStorage.get('wallets');
      expect(wallets).toStrictEqual(corruptedRequiredData.wallets);

      const knownSites = await v2ExtStorage.get('knownSites');
      expect(knownSites).toStrictEqual(corruptedRequiredData.knownSites);

      const numeraires = await v2ExtStorage.get('numeraires');
      expect(numeraires).toStrictEqual(corruptedRequiredData.numeraires);
    });

    test('invalid required data is unchanged', async () => {
      await storageArea.set({
        [VERSION_FIELD]: 1,
        wallets: 'not-a-wallet',
        knownSites: 'not-a-known-site',
        numeraires: 'not-a-numeraire',
      });

      const wallets = await v2ExtStorage.get('wallets');
      expect(wallets).toBe('not-a-wallet');

      const knownSites = await v2ExtStorage.get('knownSites');
      expect(knownSites).toBe('not-a-known-site');

      const numeraires = await v2ExtStorage.get('numeraires');
      expect(numeraires).toBe('not-a-numeraire');
    });
  });

  describe('optional data is unchanged or dropped', () => {
    test('valid optional data is unchanged', async () => {
      await storageArea.set({
        [VERSION_FIELD]: 1,
        ...validOptionalData,
      });

      const grpcEndpoint = await v2ExtStorage.get('grpcEndpoint');
      expect(grpcEndpoint).toBe(validOptionalData.grpcEndpoint);

      const frontendUrl = await v2ExtStorage.get('frontendUrl');
      expect(frontendUrl).toBe(validOptionalData.frontendUrl);

      const fullSyncHeight = await v2ExtStorage.get('fullSyncHeight');
      expect(fullSyncHeight).toBe(validOptionalData.fullSyncHeight);

      const params = await v2ExtStorage.get('params');
      expect(params).toBe(validOptionalData.params);

      const walletCreationBlockHeight = await v2ExtStorage.get('walletCreationBlockHeight');
      expect(walletCreationBlockHeight).toBeUndefined();

      const compactFrontierBlockHeight = await v2ExtStorage.get('compactFrontierBlockHeight');
      expect(compactFrontierBlockHeight).toBeUndefined();

      const backupReminderSeen = await v2ExtStorage.get('backupReminderSeen');
      expect(backupReminderSeen).toBeUndefined();
    });

    test('corrupted optional data is dropped', async () => {
      await storageArea.set({
        [VERSION_FIELD]: 1,
        grpcEndpoint: asLegacyItem(validOptionalData.grpcEndpoint),
        frontendUrl: asLegacyItem(validOptionalData.frontendUrl),
        fullSyncHeight: asLegacyItem(validOptionalData.fullSyncHeight),
        params: asLegacyItem(validOptionalData.params),
        walletCreationBlockHeight: asLegacyItem(validOptionalData.walletCreationBlockHeight),
      });

      const grpcEndpoint = await v2ExtStorage.get('grpcEndpoint');
      expect(grpcEndpoint).toBeUndefined();

      const frontendUrl = await v2ExtStorage.get('frontendUrl');
      expect(frontendUrl).toBeUndefined();

      const fullSyncHeight = await v2ExtStorage.get('fullSyncHeight');
      expect(fullSyncHeight).toBeUndefined();

      const params = await v2ExtStorage.get('params');
      expect(params).toBeUndefined();
    });

    test('invalid optional data is dropped', async () => {
      await storageArea.set({
        [VERSION_FIELD]: 1,
        ...invalidOptionalData,
      });

      const grpcEndpoint = await v2ExtStorage.get('grpcEndpoint');
      expect(grpcEndpoint).toBeUndefined();

      const frontendUrl = await v2ExtStorage.get('frontendUrl');
      expect(frontendUrl).toBeUndefined();

      const fullSyncHeight = await v2ExtStorage.get('fullSyncHeight');
      expect(fullSyncHeight).toBeUndefined();

      const params = await v2ExtStorage.get('params');
      expect(params).toBeUndefined();

      const walletCreationBlockHeight = await v2ExtStorage.get('walletCreationBlockHeight');
      expect(walletCreationBlockHeight).toBeUndefined();
    });
  });

  describe('handles `passwordKeyPrint` carefully', () => {
    test('valid passwordKeyPrint is unchanged and valid', async () => {
      await storageArea.set({
        [VERSION_FIELD]: 1,
        ...validOptionalData,
        ...onboardedData,
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

    test('corrupted passwordKeyPrint is recovered and valid', async () => {
      await storageArea.set({
        [VERSION_FIELD]: 1,
        ...validOptionalData,
        ...onboardedData,
        passwordKeyPrint: asLegacyItem(onboardedData.passwordKeyPrint),
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

    test('invalid passwordKeyPrint is unchanged and invalid', async () => {
      await storageArea.set({
        [VERSION_FIELD]: 1,
        ...validOptionalData,
        ...onboardedData,
        passwordKeyPrint: 'not-a-key-print',
      });

      const passwordKeyPrint = await v2ExtStorage.get('passwordKeyPrint');

      // not modified
      expect(passwordKeyPrint).toBe('not-a-key-print');
      expect(() => KeyPrint.fromJson(passwordKeyPrint!)).toThrow();
    });
  });
});
