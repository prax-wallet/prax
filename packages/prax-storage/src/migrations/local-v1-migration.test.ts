import { beforeEach, describe, expect, test } from 'vitest';
import { MockStorageArea } from '../mock';
import { ExtensionStorage } from '../base';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { walletIdFromBech32m } from '@penumbra-zone/bech32m/penumbrawalletid';
import { fullViewingKeyFromBech32m } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { V1LocalDefaults, V1LocalStorageState } from './local-v1';
import { localV0Migration, V0LocalStorageVersion } from './local-v1-migration';
import { V0LocalStorageState } from './local-v0';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { sample } from 'lodash';
import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { UserChoice } from '@penumbra-zone/types/user-choice';

const bech32FVK =
  'penumbrafullviewingkey1vzfytwlvq067g2kz095vn7sgcft47hga40atrg5zu2crskm6tyyjysm28qg5nth2fqmdf5n0q530jreumjlsrcxjwtfv6zdmfpe5kqsa5lg09';
const bech32WalletId =
  'penumbrawalletid15r7q7qsf3hhsgj0g530n7ng9acdacmmx9ajknjz38dyt90u9gcgsmjre75';

describe('v1 old local schema migrations', () => {
  let rawStorage: MockStorageArea;
  let v1ExtStorage: ExtensionStorage<V1LocalStorageState>;

  beforeEach(() => {
    rawStorage = new MockStorageArea();
    v1ExtStorage = new ExtensionStorage<V1LocalStorageState>({
      storage: rawStorage,
      defaults: V1LocalDefaults,
      version: {
        current: 1,
        migrations: {
          0: localV0Migration,
        },
      },
    });
  });

  test('works with all v1 local migrations together', async () => {
    const walletsVal = [
      {
        fullViewingKey: bech32FVK,
        label: 'Wallet 1',
        id: bech32WalletId,
        custody: { encryptedSeedPhrase: { nonce: '', cipherText: '' } },
      },
    ];
    const grpcEndpointVal = 'https://grpc.penumbra.silentvalidator.com';
    const frontendUrlVal = 'https://stake.with.starlingcyber.net';
    const passwordKeyPrintVal = { hash: 'xyz', salt: 'abc' };
    const fullSyncHeightVal = 13524524;
    const knownSitesVal = [
      {
        origin: 'google.com',
        choice: UserChoice.Approved,
        date: 12342342,
      },
    ];
    const paramsVal = new AppParameters({ chainId: 'penumbra-1' }).toJsonString();

    const mock0StorageState: Record<string, unknown> = {
      wallets: {
        version: V0LocalStorageVersion.V1,
        value: walletsVal,
      },
      grpcEndpoint: { version: V0LocalStorageVersion.V1, value: grpcEndpointVal },
      frontendUrl: { version: V0LocalStorageVersion.V1, value: frontendUrlVal },
      passwordKeyPrint: { version: V0LocalStorageVersion.V1, value: passwordKeyPrintVal },
      fullSyncHeight: { version: V0LocalStorageVersion.V1, value: fullSyncHeightVal },
      knownSites: { version: V0LocalStorageVersion.V1, value: knownSitesVal },
      params: { version: V0LocalStorageVersion.V1, value: paramsVal },
      // Test missing field
      // numeraires: { version: V0LocalStorageVersion.V1, value: numerairesVal },
    } satisfies Partial<V0LocalStorageState>;
    await rawStorage.set(mock0StorageState);

    const wallets = await v1ExtStorage.get('wallets');
    expect(WalletId.fromJsonString(wallets[0]?.id ?? '').inner).toEqual(
      walletIdFromBech32m(bech32WalletId).inner,
    );
    expect(FullViewingKey.fromJsonString(wallets[0]?.fullViewingKey ?? '').inner).toEqual(
      fullViewingKeyFromBech32m(bech32FVK).inner,
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
    expect(knownSites).toEqual(knownSitesVal);

    const params = await v1ExtStorage.get('params');
    expect(params).toEqual(paramsVal);
  });
});

describe('v1 old schema: migrate walletId and fullViewingKey', () => {
  let rawStorage: MockStorageArea;
  let v1ExtStorage: ExtensionStorage<V1LocalStorageState>;

  beforeEach(() => {
    rawStorage = new MockStorageArea();
    v1ExtStorage = new ExtensionStorage<V1LocalStorageState>({
      storage: rawStorage,
      defaults: V1LocalDefaults,
      version: {
        current: 1,
        migrations: {
          0: localV0Migration,
        },
      },
    });
  });

  test('should successfully migrate from V1 (old data structure) to dbVersion 1 (new data structure)', async () => {
    const mock0StorageState: Record<string, unknown> = {
      wallets: {
        version: V0LocalStorageVersion.V1,
        value: [
          {
            fullViewingKey: bech32FVK,
            label: 'Wallet 1',
            id: bech32WalletId,
            custody: { encryptedSeedPhrase: { nonce: '', cipherText: '' } },
          },
        ],
      },
    } satisfies Partial<V0LocalStorageState>;
    await rawStorage.set(mock0StorageState);

    const versionA = await rawStorage.get('dbVersion');
    expect(versionA).toStrictEqual({});

    const v0Wallets = (await rawStorage.get('wallets')) as Record<
      'wallets',
      { version: string; value: { id: string; fullViewingKey: string }[] }
    >;
    expect(v0Wallets.wallets.version).toBe(V0LocalStorageVersion.V1);
    expect(v0Wallets.wallets.value[0]?.id === bech32WalletId).toBeTruthy();
    expect(v0Wallets.wallets.value[0]?.fullViewingKey === bech32FVK).toBeTruthy();

    const v1Wallets = await v1ExtStorage.get('wallets');
    expect(WalletId.fromJsonString(v1Wallets[0]?.id ?? '').inner).toEqual(
      walletIdFromBech32m(bech32WalletId).inner,
    );
    expect(FullViewingKey.fromJsonString(v1Wallets[0]?.fullViewingKey ?? '').inner).toEqual(
      fullViewingKeyFromBech32m(bech32FVK).inner,
    );
  });

  test('work if no v0 wallets', async () => {
    const mock0StorageState: Record<string, unknown> = {
      knownSites: { version: V0LocalStorageVersion.V1, value: [] },
    } satisfies Partial<V0LocalStorageState>;
    await rawStorage.set(mock0StorageState);

    const v1Wallets = await v1ExtStorage.get('wallets');
    expect(v1Wallets).toStrictEqual([]);
  });

  test('should not migrate if its not needed', async () => {
    await v1ExtStorage.set('wallets', [
      {
        fullViewingKey: new FullViewingKey(fullViewingKeyFromBech32m(bech32FVK)).toJsonString(),
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
      fullViewingKeyFromBech32m(bech32FVK).inner,
    );
  });
});

describe('v2 old schema: validate grpc & frontendUrl', () => {
  let rawStorage: MockStorageArea;
  let v1ExtStorage: ExtensionStorage<V1LocalStorageState>;

  beforeEach(() => {
    rawStorage = new MockStorageArea();
    v1ExtStorage = new ExtensionStorage<V1LocalStorageState>({
      storage: rawStorage,
      defaults: V1LocalDefaults,
      version: {
        current: 1,
        migrations: {
          0: localV0Migration,
        },
      },
    });
  });

  test('non-affected fields stay the same', async () => {
    const mock0StorageState: Record<string, unknown> = {
      fullSyncHeight: { version: V0LocalStorageVersion.V2, value: 9483729 },
    } satisfies Partial<V0LocalStorageState>;
    await rawStorage.set(mock0StorageState);

    const versionA = await rawStorage.get('dbVersion');
    expect(versionA).toStrictEqual({});

    const syncHeight = await v1ExtStorage.get('fullSyncHeight');
    expect(syncHeight).toEqual(9483729);
  });

  describe('frontends', () => {
    test('not set frontend gets ignored', async () => {
      const mock0StorageState: Record<string, unknown> = {
        frontendUrl: { version: V0LocalStorageVersion.V2, value: '' },
      } satisfies Partial<V0LocalStorageState>;
      await rawStorage.set(mock0StorageState);

      const url = await v1ExtStorage.get('frontendUrl');
      expect(url).toEqual('');
    });

    test('have no change if user already selected frontend in registry', async () => {
      const registryClient = new ChainRegistryClient();
      const { frontends } = registryClient.bundled.globals();
      const suggestedFrontend = sample(frontends.map(f => f.url));
      const mock0StorageState: Record<string, unknown> = {
        frontendUrl: { version: V0LocalStorageVersion.V2, value: suggestedFrontend },
      } satisfies Partial<V0LocalStorageState>;
      await rawStorage.set(mock0StorageState);

      const url = await v1ExtStorage.get('frontendUrl');
      expect(url).toEqual(suggestedFrontend);
    });

    test('user gets migrated to suggested frontend', async () => {
      const registryClient = new ChainRegistryClient();
      const { frontends } = registryClient.bundled.globals();
      const mock0StorageState: Record<string, unknown> = {
        frontendUrl: { version: V0LocalStorageVersion.V2, value: 'http://badfrontend.void' },
      } satisfies Partial<V0LocalStorageState>;
      await rawStorage.set(mock0StorageState);

      const url = await v1ExtStorage.get('frontendUrl');
      expect(url).not.toEqual('http://badfrontend.void');
      expect(frontends.map(f => f.url).includes(url!)).toBeTruthy();
    });
  });

  describe('grpcEndpoint', () => {
    test('not set gets ignored', async () => {
      const mock0StorageState: Record<string, unknown> = {
        grpcEndpoint: { version: V0LocalStorageVersion.V2, value: undefined },
      } satisfies Partial<V0LocalStorageState>;
      await rawStorage.set(mock0StorageState);

      const url = await v1ExtStorage.get('grpcEndpoint');
      expect(url).toEqual(undefined);
    });

    test('not connected to mainnet gets ignored', async () => {
      const appParams = new AppParameters({ chainId: 'testnet-deimos-42' });
      const mock0StorageState: Record<string, unknown> = {
        params: { version: V0LocalStorageVersion.V2, value: appParams.toJsonString() },
        grpcEndpoint: { version: V0LocalStorageVersion.V2, value: 'grpc.testnet.void' },
      } satisfies Partial<V0LocalStorageState>;
      await rawStorage.set(mock0StorageState);

      const endpoint = await v1ExtStorage.get('grpcEndpoint');
      expect(endpoint).toEqual('grpc.testnet.void');
    });

    test('user selected suggested endpoint', async () => {
      const appParams = new AppParameters({ chainId: 'penumbra-1' });
      const registryClient = new ChainRegistryClient();
      const { rpcs } = registryClient.bundled.globals();
      const suggestedRpc = sample(rpcs.map(f => f.url));
      const mock0StorageState: Record<string, unknown> = {
        params: { version: V0LocalStorageVersion.V2, value: appParams.toJsonString() },
        grpcEndpoint: { version: V0LocalStorageVersion.V2, value: suggestedRpc },
      } satisfies Partial<V0LocalStorageState>;
      await rawStorage.set(mock0StorageState);

      const endpoint = await v1ExtStorage.get('grpcEndpoint');
      expect(endpoint).toEqual(suggestedRpc);
    });

    test('user gets migrated to suggested endpoint', async () => {
      const appParams = new AppParameters({ chainId: 'penumbra-1' });
      const mock0StorageState: Record<string, unknown> = {
        params: { version: V0LocalStorageVersion.V2, value: appParams.toJsonString() },
        grpcEndpoint: { version: V0LocalStorageVersion.V2, value: 'http://badfrontend.void' },
      } satisfies Partial<V0LocalStorageState>;
      await rawStorage.set(mock0StorageState);

      const endpoint = await v1ExtStorage.get('grpcEndpoint');
      expect(endpoint).not.toEqual('http://badfrontend.void');

      const registryClient = new ChainRegistryClient();
      const { rpcs } = registryClient.bundled.globals();
      expect(rpcs.map(r => r.url).includes(endpoint!)).toBeTruthy();
    });

    test('works from V1 storage as well', async () => {
      const appParams = new AppParameters({ chainId: 'penumbra-1' });
      const mock0StorageState: Record<string, unknown> = {
        params: { version: V0LocalStorageVersion.V1, value: appParams.toJsonString() },
        grpcEndpoint: { version: V0LocalStorageVersion.V1, value: 'http://badfrontend.void' },
      } satisfies Partial<V0LocalStorageState>;
      await rawStorage.set(mock0StorageState);

      const endpoint = await v1ExtStorage.get('grpcEndpoint');
      expect(endpoint).not.toEqual('http://badfrontend.void');

      const registryClient = new ChainRegistryClient();
      const { rpcs } = registryClient.bundled.globals();
      expect(rpcs.map(r => r.url).includes(endpoint!)).toBeTruthy();
    });
  });
});
