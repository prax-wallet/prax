import { beforeEach, describe, expect, test } from 'vitest';
import { MockStorageArea } from '../mock';
import { ExtensionStorage } from '../base';
import { localDefaults } from '../local';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { walletIdFromBech32m } from '@penumbra-zone/bech32m/penumbrawalletid';
import { fullViewingKeyFromBech32m } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { LocalStorageState } from '../types';
import { localV0Migration, V0LocalStorageState, V0LocalStorageVersion } from './local-v1-migration';

describe('migrate walletId and fullViewingKey from bech32 string to json stringified', () => {
  let rawStorage: MockStorageArea;
  let v1ExtStorage: ExtensionStorage<LocalStorageState>;
  const bech32FVK =
    'penumbrafullviewingkey1vzfytwlvq067g2kz095vn7sgcft47hga40atrg5zu2crskm6tyyjysm28qg5nth2fqmdf5n0q530jreumjlsrcxjwtfv6zdmfpe5kqsa5lg09';
  const bech32WalletId =
    'penumbrawalletid15r7q7qsf3hhsgj0g530n7ng9acdacmmx9ajknjz38dyt90u9gcgsmjre75';

  beforeEach(() => {
    rawStorage = new MockStorageArea();
    v1ExtStorage = new ExtensionStorage<LocalStorageState>({
      storage: rawStorage,
      defaults: localDefaults,
      version: {
        current: 1,
        migrations: {
          0: localV0Migration,
        },
      },
    });
  });

  test('should successfully migrate from V2 (old data structure) to dbVersion 1', async () => {
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
      grpcEndpoint: { version: V0LocalStorageVersion.V2, value: 'void.s9.gay' },
      frontendUrl: { version: V0LocalStorageVersion.V2, value: 'frontend.vercel' },
      passwordKeyPrint: { version: V0LocalStorageVersion.V2, value: { hash: '', salt: '' } },
      fullSyncHeight: { version: V0LocalStorageVersion.V2, value: 123 },
      knownSites: { version: V0LocalStorageVersion.V2, value: [] },
      params: { version: V0LocalStorageVersion.V2, value: '' },
      // numeraires: { version: V0LocalStorageVersion.V2, value: [] },
    } satisfies Partial<V0LocalStorageState>;
    await rawStorage.set(mock0StorageState);

    const versionA = await rawStorage.get('dbVersion');
    expect(versionA).toStrictEqual({});

    const v1Wallets = (await rawStorage.get('wallets')) as Record<
      'wallets',
      { version: string; value: { id: string; fullViewingKey: string }[] }
    >;
    expect(v1Wallets.wallets.version).toBe(V0LocalStorageVersion.V1);
    expect(v1Wallets.wallets.value[0]?.id === bech32WalletId).toBeTruthy();
    expect(v1Wallets.wallets.value[0]?.fullViewingKey === bech32FVK).toBeTruthy();

    const v2Wallets = await v1ExtStorage.get('wallets');
    expect(WalletId.fromJsonString(v2Wallets[0]?.id ?? '').inner).toEqual(
      walletIdFromBech32m(bech32WalletId).inner,
    );
    expect(FullViewingKey.fromJsonString(v2Wallets[0]?.fullViewingKey ?? '').inner).toEqual(
      fullViewingKeyFromBech32m(bech32FVK).inner,
    );
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
