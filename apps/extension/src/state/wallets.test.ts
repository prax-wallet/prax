import { create, StoreApi, UseBoundStore } from 'zustand';
import { AllSlices, initializeStore } from '.';
import { customPersist } from './persist';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { localExtStorage } from '@repo/storage-chrome/local';
import { sessionExtStorage } from '@repo/storage-chrome/session';
import { generateSpendKey, getFullViewingKey } from '@penumbra-zone/wasm/keys';
import { Key } from '@repo/encryption/key';
import { Wallet, type WalletJson } from '@repo/wallet';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { Box } from '@repo/encryption/box';

const seedPhrase1 = [
  'road',
  'topic',
  'empty',
  'egg',
  'hint',
  'check',
  'verb',
  'document',
  'dad',
  'fish',
  'matrix',
  'problem',
];

const seedPhrase2 = [
  'portion',
  'coach',
  'venture',
  'bomb',
  'viable',
  'never',
  'boring',
  'session',
  'ranch',
  'near',
  'expose',
  'similar',
];

const { mock: localMock, listeners: localListeners } = chrome.storage.local as unknown as {
  mock: Map<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  listeners: Set<(changes: { [key: string]: chrome.storage.StorageChange }) => void>;
};
const { mock: sessionMock, listeners: sessionListeners } = chrome.storage.session as unknown as {
  mock: Map<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  listeners: Set<(changes: { [key: string]: chrome.storage.StorageChange }) => void>;
};

describe('Accounts Slice', () => {
  let useStore: UseBoundStore<StoreApi<AllSlices>>;

  beforeEach(async () => {
    localMock.clear();
    sessionMock.clear();
    localListeners.clear();
    sessionListeners.clear();
    useStore = create<AllSlices>()(
      customPersist(initializeStore(sessionExtStorage, localExtStorage)),
    );

    // Wait for the persistence layer to complete its initial sync from storage to state
    await vi.waitFor(() => expect(localListeners.size).toBe(1));
  });

  test('wallets start off empty', () => {
    expect(useStore.getState().wallets.all).toStrictEqual([]);
  });

  // Mock the removed methods
  async function setPassword(password: string) {
    const { key, keyPrint } = await Key.create(password);
    await sessionExtStorage.set('passwordKey', await key.toJson());
    await localExtStorage.set('passwordKeyPrint', await keyPrint.toJson());
  }

  async function addWallet(
    label: string,
    fullViewingKey: FullViewingKey,
    _uselessName: 'encryptedSeedPhrase',
    seedPhrase: string,
  ) {
    const passwordKey = await sessionExtStorage.get('passwordKey');
    const key = await Key.fromJson(passwordKey!);
    const encryptedSeedPhrase = await key.seal(seedPhrase);

    const wallet = new Wallet(label, fullViewingKey, { encryptedSeedPhrase });
    const existingWallets = await localExtStorage.get('wallets');
    await localExtStorage.set('wallets', [wallet.toJson(), ...existingWallets]);
  }

  describe('addWallet()', () => {
    test('throws if no password in storage', async () => {
      const accountA = {
        label: 'Account #1',
        seedPhrase: seedPhrase1,
      };
      await expect(
        addWallet(
          accountA.label,
          getFullViewingKey(generateSpendKey(accountA.seedPhrase.join(' '))),
          'encryptedSeedPhrase',
          accountA.seedPhrase.join(' '),
        ),
      ).rejects.toThrow();
    });

    test('accounts can be added', async () => {
      await setPassword('user_password_123');
      const accountA = {
        label: 'Account #1',
        seedPhrase: seedPhrase1,
      };
      await addWallet(
        accountA.label,
        getFullViewingKey(generateSpendKey(accountA.seedPhrase.join(' '))),
        'encryptedSeedPhrase',
        accountA.seedPhrase.join(' '),
      );
      expect(useStore.getState().wallets.all.length).toBe(1);
      expect(useStore.getState().wallets.all.at(0)!.label).toBe(accountA.label);

      // Test in long term storage
      const accountsPt1 = await localExtStorage.get('wallets');
      expect(accountsPt1.length).toBe(1);
      expect(accountsPt1.at(0)!.label).toBe(accountA.label);

      const accountB = {
        label: 'Account #2',
        seedPhrase: seedPhrase2,
      };
      await addWallet(
        accountB.label,
        getFullViewingKey(generateSpendKey(accountB.seedPhrase.join(' '))),
        'encryptedSeedPhrase',
        accountB.seedPhrase.join(' '),
      );
      expect(useStore.getState().wallets.all.length).toBe(2);
      expect(useStore.getState().wallets.all.at(0)!.label).toBe(accountB.label);
      expect(useStore.getState().wallets.all.at(1)!.label).toBe(accountA.label);

      // Test in long term storage
      const accountsPt2 = await localExtStorage.get('wallets');
      expect(accountsPt2.length).toBe(2);
      expect(accountsPt2.at(0)!.label).toBe(accountB.label);
      expect(accountsPt2.at(1)!.label).toBe(accountA.label);
    });
  });

  describe('getSeedPhrase()', () => {
    test('seed phrase can be return', async () => {
      await setPassword('user_password_123');
      const initialSeedPhrase = seedPhrase1.join(' ');
      const accountA = {
        label: 'Account #1',
        seedPhrase: initialSeedPhrase,
      };
      await addWallet(
        accountA.label,
        getFullViewingKey(generateSpendKey(accountA.seedPhrase)),
        'encryptedSeedPhrase',
        accountA.seedPhrase,
      );
      expect(useStore.getState().wallets.all.length).toBe(1);
      expect(useStore.getState().wallets.all.at(0)!.label).toBe(accountA.label);

      const walletJson = useStore.getState().wallets
        .all[0] as unknown as WalletJson<'encryptedSeedPhrase'>;
      const seedPhraseFromKey = await useStore
        .getState()
        .password.unseal(Box.fromJson(walletJson.custody.encryptedSeedPhrase));
      expect(seedPhraseFromKey).toStrictEqual(initialSeedPhrase);
    });

    test('seed phrase can be return after relogin', async () => {
      const password = 'user_password_123';
      await setPassword(password);
      const initialSeedPhrase = seedPhrase1.join(' ');
      const accountA = {
        label: 'Account #1',
        seedPhrase: initialSeedPhrase,
      };
      await addWallet(
        accountA.label,
        getFullViewingKey(generateSpendKey(accountA.seedPhrase)),
        'encryptedSeedPhrase',
        accountA.seedPhrase,
      );
      expect(useStore.getState().wallets.all.length).toBe(1);
      expect(useStore.getState().wallets.all.at(0)!.label).toBe(accountA.label);

      const seedPhraseFromKey = await useStore
        .getState()
        .password.unseal(
          Box.fromJson(
            (useStore.getState().wallets.all.at(0) as WalletJson<'encryptedSeedPhrase'>).custody
              .encryptedSeedPhrase,
          ),
        );
      expect(seedPhraseFromKey).toStrictEqual(initialSeedPhrase);

      useStore.getState().password.clearSessionPassword();
      await useStore.getState().password.setSessionPassword(password);
      const seedPhraseFromKeyAfterRelogin = await useStore
        .getState()
        .password.unseal(
          Box.fromJson(
            (useStore.getState().wallets.all.at(0) as WalletJson<'encryptedSeedPhrase'>).custody
              .encryptedSeedPhrase,
          ),
        );
      expect(seedPhraseFromKeyAfterRelogin).toStrictEqual(initialSeedPhrase);
    });
  });
});
