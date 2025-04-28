import { create, StoreApi, UseBoundStore } from 'zustand';
import { AllSlices, initializeStore } from '.';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { webcrypto } from 'crypto';
import { ExtensionStorage } from '../storage/base';
import { mockLocalExtStorage, mockSessionExtStorage } from '../storage/mock';
import { LocalStorageState } from '../storage/types';

vi.stubGlobal('crypto', webcrypto);

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

describe('Accounts Slice', () => {
  let useStore: UseBoundStore<StoreApi<AllSlices>>;
  let localStorage: ExtensionStorage<LocalStorageState>;

  beforeEach(() => {
    localStorage = mockLocalExtStorage();
    useStore = create<AllSlices>()(initializeStore(mockSessionExtStorage(), localStorage));
  });

  test('accounts start off empty', () => {
    expect(useStore.getState().wallets.active).toBeUndefined();
  });

  describe('addWallet()', () => {
    test('throws if no password in storage', async () => {
      const accountA = {
        label: 'Account #1',
        seedPhrase: seedPhrase1,
      };
      await expect(
        useStore.getState().wallets.addSeedPhraseWallet(accountA.label, accountA.seedPhrase),
      ).rejects.toThrow();
    });

    test('accounts can be added', async () => {
      await useStore.getState().password.setPassword('user_password_123');
      const accountA = {
        label: 'Account #1',
        seedPhrase: seedPhrase1,
      };
      await useStore.getState().wallets.addSeedPhraseWallet(accountA.label, accountA.seedPhrase);
      expect(useStore.getState().wallets.active).toBeDefined();
      expect(useStore.getState().wallets.active!.label).toBe(accountA.label);

      // Test in long term storage
      const accountsPt1 = await localStorage.get('wallets');
      expect(accountsPt1.length).toBe(1);
      expect(accountsPt1.at(0)!.label).toBe(accountA.label);

      const accountB = {
        label: 'Account #2',
        seedPhrase: seedPhrase2,
      };
      await useStore.getState().wallets.addSeedPhraseWallet(accountB.label, accountB.seedPhrase);
      expect(useStore.getState().wallets.active).toBeDefined();
      expect(useStore.getState().wallets.active!.label).toBe(accountB.label);

      // Test in long term storage
      const accountsPt2 = await localStorage.get('wallets');
      expect(accountsPt2.length).toBe(2);
      expect(accountsPt2.at(0)!.label).toBe(accountB.label);
      expect(accountsPt2.at(1)!.label).toBe(accountA.label);
    });
  });
});
