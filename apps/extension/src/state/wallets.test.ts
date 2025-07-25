import { create, StoreApi, UseBoundStore } from 'zustand';
import { AllSlices, initializeStore } from '.';
import { beforeEach, describe, expect, test } from 'vitest';
import { localExtStorage } from '@repo/storage-chrome/local';
import { sessionExtStorage } from '@repo/storage-chrome/session';

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

const localMock = (chrome.storage.local as unknown as { mock: Map<string, unknown> }).mock;
const sessionMock = (chrome.storage.session as unknown as { mock: Map<string, unknown> }).mock;

describe('Accounts Slice', () => {
  let useStore: UseBoundStore<StoreApi<AllSlices>>;

  beforeEach(() => {
    localMock.clear();
    sessionMock.clear();
    useStore = create<AllSlices>()(initializeStore(sessionExtStorage, localExtStorage));
  });

  test('accounts start off empty', () => {
    expect(useStore.getState().wallets.all).toStrictEqual([]);
  });

  describe('addWallet()', () => {
    test('throws if no password in storage', async () => {
      const accountA = {
        label: 'Account #1',
        seedPhrase: seedPhrase1,
      };
      await expect(useStore.getState().wallets.addWallet(accountA)).rejects.toThrow();
    });

    test('accounts can be added', async () => {
      await useStore.getState().password.setPassword('user_password_123');
      const accountA = {
        label: 'Account #1',
        seedPhrase: seedPhrase1,
      };
      await useStore.getState().wallets.addWallet(accountA);
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
      await useStore.getState().wallets.addWallet(accountB);
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
      await useStore.getState().password.setPassword('user_password_123');
      const initialSeedPhrase = seedPhrase1;
      const accountA = {
        label: 'Account #1',
        seedPhrase: initialSeedPhrase,
      };
      await useStore.getState().wallets.addWallet(accountA);
      expect(useStore.getState().wallets.all.length).toBe(1);
      expect(useStore.getState().wallets.all.at(0)!.label).toBe(accountA.label);

      const seedPhraseFromKey = await useStore.getState().wallets.getSeedPhrase();
      expect(seedPhraseFromKey).toStrictEqual(initialSeedPhrase);
    });

    test('seed phrase can be return after relogin', async () => {
      const password = 'user_password_123';
      await useStore.getState().password.setPassword(password);
      const initialSeedPhrase = seedPhrase1;
      const accountA = {
        label: 'Account #1',
        seedPhrase: initialSeedPhrase,
      };
      await useStore.getState().wallets.addWallet(accountA);
      expect(useStore.getState().wallets.all.length).toBe(1);
      expect(useStore.getState().wallets.all.at(0)!.label).toBe(accountA.label);

      const seedPhraseFromKey = await useStore.getState().wallets.getSeedPhrase();
      expect(seedPhraseFromKey).toStrictEqual(initialSeedPhrase);

      useStore.getState().password.clearSessionPassword();
      await useStore.getState().password.setSessionPassword(password);
      const seedPhraseFromKeyAfterRelogin = await useStore.getState().wallets.getSeedPhrase();
      expect(seedPhraseFromKeyAfterRelogin).toStrictEqual(initialSeedPhrase);
    });
  });
});
