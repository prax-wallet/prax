import { ChainRegistryClient } from '@penumbra-labs/registry';
import { fullViewingKeyFromBech32m } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { walletIdFromBech32m } from '@penumbra-zone/bech32m/penumbrawalletid';
import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import sample from 'lodash/sample';
import { beforeEach, describe, expect, test } from 'vitest';
import { ExtensionStorage } from '../base';
import * as Storage_V0 from '../versions/v0';
import * as Storage_V1 from '../versions/v1';
import localV0Migration from './v0-v1';
import { MockStorageArea } from '@repo/mock-chrome/mocks/storage-area';
import { VERSION_FIELD } from '../version-field';

const bech32Fvk =
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- const is meaningful
  'penumbrafullviewingkey1vzfytwlvq067g2kz095vn7sgcft47hga40atrg5zu2crskm6tyyjysm28qg5nth2fqmdf5n0q530jreumjlsrcxjwtfv6zdmfpe5kqsa5lg09' as const;
const bech32WalletId =
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- const is meaningful
  'penumbrawalletid15r7q7qsf3hhsgj0g530n7ng9acdacmmx9ajknjz38dyt90u9gcgsmjre75' as const;

const storageArea = new MockStorageArea();

const registryGlobals = new ChainRegistryClient().bundled.globals();
const rpcs = registryGlobals.rpcs.map(({ url }) => url);
const frontends = registryGlobals.frontends.map(({ url }) => url);

describe('v1 old local schema migrations', () => {
  let v1ExtStorage: ExtensionStorage<Storage_V1.LOCAL, Storage_V1.VERSION>;

  beforeEach(() => {
    storageArea.mock.clear();
    v1ExtStorage = new ExtensionStorage<Storage_V1.LOCAL, Storage_V1.VERSION>(
      storageArea,
      { wallets: [], knownSites: [], numeraires: [] },
      1,
      { 0: localV0Migration },
    );
  });

  test('works with all v1 local migrations together', async () => {
    const grpcEndpointVal = 'https://grpc.penumbra.silentvalidator.com';
    const frontendUrlVal = 'https://stake.with.starlingcyber.net';
    const passwordKeyPrintVal = { hash: 'xyz', salt: 'abc' };
    const fullSyncHeightVal = 13524524;
    const paramsVal = new AppParameters({ chainId: 'penumbra-1' }).toJsonString();

    const mock0StorageState: Partial<Storage_V0.LOCAL> = {
      wallets: {
        version: 'V1',
        value: [
          {
            fullViewingKey: bech32Fvk,
            label: 'Wallet 1',
            id: bech32WalletId,
            custody: { encryptedSeedPhrase: { nonce: '', cipherText: '' } },
          },
        ],
      },
      grpcEndpoint: { version: 'V1', value: grpcEndpointVal },
      frontendUrl: { version: 'V1', value: frontendUrlVal },
      passwordKeyPrint: { version: 'V1', value: passwordKeyPrintVal },
      fullSyncHeight: { version: 'V1', value: fullSyncHeightVal },
      knownSites: {
        version: 'V1',
        value: [{ origin: 'google.com', choice: 'Approved', date: 12342342 }],
      },
      params: { version: 'V1', value: paramsVal },
      // Test missing field
      // numeraires: { version: V0LocalStorageVersion.V1, value: numerairesVal },
    };

    await storageArea.set(mock0StorageState);

    const wallets = await v1ExtStorage.get('wallets');
    expect(WalletId.fromJsonString(wallets[0]?.id ?? '').inner).toEqual(
      walletIdFromBech32m(bech32WalletId).inner,
    );
    expect(FullViewingKey.fromJsonString(wallets[0]?.fullViewingKey ?? '').inner).toEqual(
      fullViewingKeyFromBech32m(bech32Fvk).inner,
    );

    const endpoint = await v1ExtStorage.get('grpcEndpoint');
    expect(endpoint).toEqual(grpcEndpointVal);

    const frontendUrl = await v1ExtStorage.get('frontendUrl');
    expect(frontendUrl).toEqual(frontendUrlVal);

    const passwordKeyPrint = await v1ExtStorage.get('passwordKeyPrint');
    expect(passwordKeyPrint).toEqual(passwordKeyPrintVal);

    const fullSyncHeight = await v1ExtStorage.get('fullSyncHeight');
    expect(fullSyncHeight).toEqual(fullSyncHeightVal);

    const knownSites = await v1ExtStorage.get('knownSites');
    expect(knownSites).toEqual([{ origin: 'google.com', choice: 'Approved', date: 12342342 }]);

    const params = await v1ExtStorage.get('params');
    expect(params).toEqual(paramsVal);
  });
});

describe('v1 old schema: migrate walletId and fullViewingKey', () => {
  let v1ExtStorage: ExtensionStorage<Storage_V1.LOCAL, Storage_V1.VERSION>;

  beforeEach(() => {
    storageArea.mock.clear();
    v1ExtStorage = new ExtensionStorage<Storage_V1.LOCAL, Storage_V1.VERSION>(
      storageArea,
      { wallets: [], knownSites: [], numeraires: [] },
      1,
      { 0: localV0Migration },
    );
  });

  test('should successfully migrate from versioned items to versioned area', async () => {
    const mock0StorageState: Partial<Storage_V0.LOCAL> = {
      wallets: {
        version: 'V1',
        value: [
          {
            fullViewingKey: bech32Fvk,
            label: 'Wallet 1',
            id: bech32WalletId,
            custody: { encryptedSeedPhrase: { nonce: '', cipherText: '' } },
          },
        ],
      },
    };
    await storageArea.set(mock0StorageState);

    const versionA = await storageArea.get(VERSION_FIELD);
    expect(versionA).toStrictEqual({});

    const v0Wallets = (await storageArea.get('wallets')) as Record<
      'wallets',
      { version: string; value: { id: string; fullViewingKey: string }[] }
    >;
    expect(v0Wallets.wallets.version).toBe('V1');
    expect(v0Wallets.wallets.value[0]?.id === bech32WalletId).toBeTruthy();
    expect(v0Wallets.wallets.value[0]?.fullViewingKey === bech32Fvk).toBeTruthy();

    const v1Wallets = await v1ExtStorage.get('wallets');
    expect(WalletId.fromJsonString(v1Wallets[0]?.id ?? '').inner).toEqual(
      walletIdFromBech32m(bech32WalletId).inner,
    );
    expect(FullViewingKey.fromJsonString(v1Wallets[0]?.fullViewingKey ?? '').inner).toEqual(
      fullViewingKeyFromBech32m(bech32Fvk).inner,
    );
  });

  test('work if no v0 wallets', async () => {
    const mock0StorageState: Partial<Storage_V0.LOCAL> = {
      knownSites: { version: 'V1', value: [] },
    };
    await storageArea.set(mock0StorageState);

    const v1Wallets = await v1ExtStorage.get('wallets');
    expect(v1Wallets).toStrictEqual([]);
  });

  test('should not migrate if its not needed', async () => {
    await v1ExtStorage.set('wallets', [
      {
        fullViewingKey: new FullViewingKey(fullViewingKeyFromBech32m(bech32Fvk)).toJsonString(),
        label: 'Wallet 1',
        id: new WalletId(walletIdFromBech32m(bech32WalletId)).toJsonString(),
        custody: { encryptedSeedPhrase: { nonce: '', cipherText: '' } },
      },
    ]);

    const v2Wallets = await v1ExtStorage.get('wallets');
    expect(WalletId.fromJsonString(v2Wallets[0]?.id ?? '').inner).toEqual(
      walletIdFromBech32m(bech32WalletId).inner,
    );
    expect(FullViewingKey.fromJsonString(v2Wallets[0]?.fullViewingKey ?? '').inner).toEqual(
      fullViewingKeyFromBech32m(bech32Fvk).inner,
    );
  });
});

describe('v2 old schema: validate grpc & frontendUrl', () => {
  let v1ExtStorage: ExtensionStorage<Storage_V1.LOCAL, Storage_V1.VERSION>;

  beforeEach(() => {
    storageArea.mock.clear();
    v1ExtStorage = new ExtensionStorage<Storage_V1.LOCAL, Storage_V1.VERSION>(
      storageArea,
      { wallets: [], knownSites: [], numeraires: [] },
      1,
      { 0: localV0Migration },
    );
  });

  test('non-affected fields stay the same', async () => {
    const mock0StorageState: Partial<Storage_V0.LOCAL> = {
      fullSyncHeight: { version: 'V2', value: 9483729 },
    };
    await storageArea.set(mock0StorageState);

    const versionA = await storageArea.get(VERSION_FIELD);
    expect(versionA).toStrictEqual({});

    const syncHeight = await v1ExtStorage.get('fullSyncHeight');
    expect(syncHeight).toEqual(9483729);
  });

  describe('frontends', () => {
    test('not set frontend gets ignored', async () => {
      const mock0StorageState: Partial<Storage_V0.LOCAL> = {
        frontendUrl: { version: 'V2', value: '' },
      };
      await storageArea.set(mock0StorageState);

      const url = await v1ExtStorage.get('frontendUrl');
      expect(url).toEqual(undefined);
    });

    test('have no change if user already selected frontend in registry', async () => {
      const suggestedFrontend = sample(frontends);
      const mock0StorageState: Partial<Storage_V0.LOCAL> = {
        frontendUrl: { version: 'V2', value: suggestedFrontend },
      };
      await storageArea.set(mock0StorageState);

      const url = await v1ExtStorage.get('frontendUrl');
      expect(url).toEqual(suggestedFrontend);
    });

    test('user gets migrated to suggested frontend', async () => {
      const mock0StorageState: Partial<Storage_V0.LOCAL> = {
        frontendUrl: { version: 'V2', value: 'http://badfrontend.void' },
      };
      await storageArea.set(mock0StorageState);

      const url = await v1ExtStorage.get('frontendUrl');
      expect(url).toBeDefined();
      expect(url).not.toEqual('http://badfrontend.void');
      expect(frontends).toContain(url);
    });
  });

  describe('grpcEndpoint', () => {
    test('not set gets ignored', async () => {
      const mock0StorageState: Partial<Storage_V0.LOCAL> = {
        grpcEndpoint: { version: 'V2', value: undefined },
      };
      await storageArea.set(mock0StorageState);

      const url = await v1ExtStorage.get('grpcEndpoint');
      expect(url).toEqual(undefined);
    });

    test('not connected to mainnet gets ignored', async () => {
      const appParams = new AppParameters({ chainId: 'testnet-deimos-42' });
      const mock0StorageState: Partial<Storage_V0.LOCAL> = {
        params: { version: 'V2', value: appParams.toJsonString() },
        grpcEndpoint: { version: 'V2', value: 'grpc.testnet.void' },
      };
      await storageArea.set(mock0StorageState);

      const endpoint = await v1ExtStorage.get('grpcEndpoint');
      expect(endpoint).toEqual('grpc.testnet.void');
    });

    test('user selected suggested endpoint', async () => {
      const appParams = new AppParameters({ chainId: 'penumbra-1' });
      const suggestedRpc = sample(rpcs);
      const mock0StorageState: Partial<Storage_V0.LOCAL> = {
        params: { version: 'V2', value: appParams.toJsonString() },
        grpcEndpoint: { version: 'V2', value: suggestedRpc },
      };
      await storageArea.set(mock0StorageState);

      const endpoint = await v1ExtStorage.get('grpcEndpoint');
      expect(endpoint).toEqual(suggestedRpc);
    });

    test('user gets migrated to suggested endpoint', async () => {
      const appParams = new AppParameters({ chainId: 'penumbra-1' });
      const mock0StorageState: Partial<Storage_V0.LOCAL> = {
        params: { version: 'V2', value: appParams.toJsonString() },
        grpcEndpoint: { version: 'V2', value: 'http://badfrontend.void' },
      };
      await storageArea.set(mock0StorageState);

      const endpoint = await v1ExtStorage.get('grpcEndpoint');
      expect(endpoint).toBeDefined();
      expect(endpoint).not.toEqual('http://badfrontend.void');

      expect(rpcs).toContain(endpoint);
    });

    test('works from V1 storage as well', async () => {
      const appParams = new AppParameters({ chainId: 'penumbra-1' });
      const mock0StorageState: Partial<Storage_V0.LOCAL> = {
        params: { version: 'V1', value: appParams.toJsonString() },
        grpcEndpoint: { version: 'V1', value: 'http://badfrontend.void' },
      };
      await storageArea.set(mock0StorageState);

      const endpoint = await v1ExtStorage.get('grpcEndpoint');
      expect(endpoint).not.toEqual('http://badfrontend.void');

      expect(rpcs).toContain(endpoint);
    });
  });
});
