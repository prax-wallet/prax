import { beforeEach, describe, expect, test, vi } from 'vitest';
import { create, StoreApi, UseBoundStore } from 'zustand';
import { PlainMessage } from '@bufbuild/protobuf';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { generateSpendKey, getFullViewingKey } from '@penumbra-zone/wasm/keys';
import { generateMnemonic } from 'bip39';
import { Key } from '@repo/encryption/key';
import { AllSlices, initializeStore } from '..';
import { customPersist } from '../persist';
import { localExtStorage } from '@repo/storage-chrome/local';
import { sessionExtStorage } from '@repo/storage-chrome/session';
import type { OnboardingCustody } from './index';
import type { MockStorageArea } from '@repo/mock-chrome/mocks/storage-area';
import { Wallet, type WalletJson } from '@repo/wallet';

const { mock: localMock, listeners: localListeners } = chrome.storage
  .local as unknown as MockStorageArea;
const { mock: sessionMock, listeners: sessionListeners } = chrome.storage
  .session as unknown as MockStorageArea;

describe('OnboardingSlice', () => {
  let useStore: UseBoundStore<StoreApi<AllSlices>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset storage mocks
    localMock.clear();
    sessionMock.clear();
    localListeners.clear();
    sessionListeners.clear();

    useStore = create<AllSlices>()(
      customPersist(initializeStore(sessionExtStorage, localExtStorage)),
    );

    await vi.waitFor(() => expect(localListeners.size).toBe(1));
  });

  describe('Initial state', () => {
    test('starts with null onboarding custody', () => {
      expect(useStore.getState().onboarding.onboardingCustody).toBeNull();
    });

    test('has all sub-slices initialized', () => {
      const state = useStore.getState().onboarding;

      expect(state.generatePhrase).toBeDefined();
      expect(state.importPhrase).toBeDefined();
      expect(state.connectLedger).toBeDefined();

      expect(state.generatePhrase.phrase).toEqual([]);
      expect(state.importPhrase.phrase).toEqual(new Array(12).fill(''));
      expect(state.importPhrase.phraseLength).toBe(12);
    });
  });

  describe('Onboarding orchestration', () => {
    test('beginOnboarding sets custody type', () => {
      const custodyTypes: OnboardingCustody[] = ['generated', 'imported', 'ledger'];

      custodyTypes.forEach(custodyType => {
        useStore.getState().onboarding.beginOnboarding(custodyType);
        expect(useStore.getState().onboarding.onboardingCustody).toBe(custodyType);
      });
    });

    test('sub-slices can set their own custody types', () => {
      // Generated phrase slice
      useStore.getState().onboarding.generatePhrase.initOnboardingType();
      expect(useStore.getState().onboarding.onboardingCustody).toBe('generated');

      // Import phrase slice
      useStore.getState().onboarding.importPhrase.initOnboardingType();
      expect(useStore.getState().onboarding.onboardingCustody).toBe('imported');

      // Ledger slice
      useStore.getState().onboarding.connectLedger.initOnboardingType();
      expect(useStore.getState().onboarding.onboardingCustody).toBe('ledger');
    });
  });

  describe('Password management', () => {
    test('creates new password when none exists', async () => {
      const result = await useStore.getState().onboarding.onboardPassword('test-password');

      expect(result).toBeInstanceOf(Key);
      expect(localMock.get('passwordKeyPrint')).toBeDefined();
      expect(sessionMock.get('passwordKey')).toBeDefined();
    });

    test('recreates password when key print exists', async () => {
      // First create a password
      await useStore.getState().onboarding.onboardPassword('original-password');

      // Then recreate with the same password
      const result = await useStore.getState().onboarding.onboardPassword('original-password');

      expect(result).toBeInstanceOf(Key);
    });

    test('throws error when password does not match', async () => {
      // First create a password
      await useStore.getState().onboarding.onboardPassword('original-password');

      // Then try with wrong password
      await expect(
        useStore.getState().onboarding.onboardPassword('wrong-password'),
      ).rejects.toThrow('Password does not match');
    });
  });

  describe('Wallet creation workflows', () => {
    let mockKey: Key;

    beforeEach(async () => {
      mockKey = await useStore.getState().onboarding.onboardPassword('test-password');
    });

    test('complete generated wallet flow', async () => {
      useStore.getState().onboarding.beginOnboarding('generated');

      const testMnemonic = generateMnemonic();
      const testPhrase = testMnemonic.split(' ');
      useStore.setState(state => {
        state.onboarding.generatePhrase.phrase = testPhrase;
        return state;
      });

      await useStore.getState().onboarding.onboardWallet(mockKey);

      const wallet = Wallet.fromJson((localMock.get('wallets') as [WalletJson])[0]);
      expect(wallet.label).toBe('Generated Wallet');
      expect(wallet.custodyType).toBe('encryptedSeedPhrase');

      const custodyBox = wallet.custodyBox;
      const decryptedSeedPhrase = await mockKey.unseal(custodyBox);
      expect(decryptedSeedPhrase).toBe(testMnemonic);

      const expectedSpendKey = generateSpendKey(testMnemonic);
      const expectedFvk = getFullViewingKey(expectedSpendKey);
      expect(wallet.fullViewingKey.toJsonString()).toBe(expectedFvk.toJsonString());
    });

    test('complete imported wallet flow', async () => {
      useStore.getState().onboarding.beginOnboarding('imported');

      const testMnemonic = generateMnemonic();
      const testPhrase = testMnemonic.split(' ');
      useStore.setState(state => {
        state.onboarding.importPhrase.phrase = testPhrase;
        return state;
      });

      await useStore.getState().onboarding.onboardWallet(mockKey);

      const wallet = Wallet.fromJson((localMock.get('wallets') as [WalletJson])[0]);
      expect(wallet.label).toBe('Imported Wallet');
      expect(wallet.custodyType).toBe('encryptedSpendKey');

      const custodyBox = wallet.custodyBox;
      const decryptedSpendKeyJson = await mockKey.unseal(custodyBox);
      const expectedSpendKey = generateSpendKey(testMnemonic);
      expect(decryptedSpendKeyJson).toBe(expectedSpendKey.toJsonString());

      const expectedFvk = getFullViewingKey(expectedSpendKey);
      expect(wallet.fullViewingKey.toJsonString()).toBe(expectedFvk.toJsonString());
    });

    test('complete ledger wallet flow', async () => {
      useStore.getState().onboarding.beginOnboarding('ledger');

      const testDevice = {
        vendorId: 0x2c97,
        productId: 0x0001,
        classCode: 0,
        subclassCode: 0,
        protocolCode: 0,
        serialNumber: 'LEDGER123',
      };
      const testFullViewingKey = {
        inner: new Uint8Array(64),
      } as PlainMessage<FullViewingKey>;

      useStore.setState(state => {
        state.onboarding.connectLedger.specificDevice = testDevice;
        state.onboarding.connectLedger.fullViewingKey = testFullViewingKey;
        return state;
      });

      await useStore.getState().onboarding.onboardWallet(mockKey);

      const wallet = Wallet.fromJson((localMock.get('wallets') as [WalletJson])[0]);
      expect(wallet.label).toBe('Ledger Wallet');
      expect(wallet.custodyType).toBe('ledgerUsb');

      const custodyBox = wallet.custodyBox;
      const decryptedDeviceJson = await mockKey.unseal(custodyBox);
      expect(decryptedDeviceJson).toBe(JSON.stringify(testDevice));

      const expectedFvk = new FullViewingKey(testFullViewingKey);
      expect(wallet.fullViewingKey.toJsonString()).toBe(expectedFvk.toJsonString());
    });
  });

  describe('Storage state management', () => {
    test('updateHasPassword reflects storage state', async () => {
      // Initially no password
      await useStore.getState().onboarding.updateHasPassword();
      expect(useStore.getState().onboarding.hasPassword).toBe(false);

      // After setting password
      localMock.set('passwordKeyPrint', 'mock-key-print');
      await useStore.getState().onboarding.updateHasPassword();
      expect(useStore.getState().onboarding.hasPassword).toBe(true);
    });

    test('updateHasWallets reflects wallet count', async () => {
      // Initially no wallets
      await useStore.getState().onboarding.updateHasWallets();
      expect(useStore.getState().onboarding.hasWallets).toBe(0);

      // After adding wallets
      const mockWallets = [{ id: '1' }, { id: '2' }];
      localMock.set('wallets', mockWallets);
      await useStore.getState().onboarding.updateHasWallets();
      expect(useStore.getState().onboarding.hasWallets).toBe(2);
    });
  });

  describe('Remote onboarding functions', () => {
    test('onboardFrontendUrl uses existing URL from storage', async () => {
      const existingUrl = 'https://existing-frontend.com';
      localMock.set('frontendUrl', existingUrl);

      const result = await useStore.getState().onboarding.onboardFrontendUrl({});

      expect(result.frontendUrl).toBe(existingUrl);
      expect(useStore.getState().onboarding.frontendUrl).toBe(existingUrl);
    });
  });

  describe('State consistency', () => {
    test('custody type changes are reflected across slices', () => {
      expect(useStore.getState().onboarding.onboardingCustody).toBeNull();

      useStore.getState().onboarding.generatePhrase.initOnboardingType();
      expect(useStore.getState().onboarding.onboardingCustody).toBe('generated');

      useStore.getState().onboarding.beginOnboarding('imported');
      expect(useStore.getState().onboarding.onboardingCustody).toBe('imported');
    });

    test('multiple wallets can be created sequentially', async () => {
      const mockKey = await useStore.getState().onboarding.onboardPassword('test-password');

      // Create first wallet (use BIP39 mnemonic generation)
      useStore.getState().onboarding.beginOnboarding('generated');
      useStore.setState(state => {
        state.onboarding.generatePhrase.phrase = generateMnemonic().split(' ');
        return state;
      });
      await useStore.getState().onboarding.onboardWallet(mockKey);
      expect(localMock.get('wallets')).toHaveLength(1);

      // Create second wallet (use different BIP39 mnemonic generation)
      useStore.getState().onboarding.beginOnboarding('imported');
      useStore.setState(state => {
        state.onboarding.importPhrase.phrase = generateMnemonic().split(' ');
        return state;
      });
      await useStore.getState().onboarding.onboardWallet(mockKey);
      expect(localMock.get('wallets')).toHaveLength(2);
    });

    test('prevents duplicate wallet creation', async () => {
      const mockKey = await useStore.getState().onboarding.onboardPassword('test-password');
      const mnemonic = generateMnemonic();

      // Create first wallet with specific mnemonic
      useStore.getState().onboarding.beginOnboarding('generated');
      useStore.setState(state => {
        state.onboarding.generatePhrase.phrase = mnemonic.split(' ');
        return state;
      });
      await useStore.getState().onboarding.onboardWallet(mockKey);
      expect(localMock.get('wallets')).toHaveLength(1);

      // Attempt to create duplicate wallet with same mnemonic
      useStore.getState().onboarding.beginOnboarding('imported');
      useStore.setState(state => {
        state.onboarding.importPhrase.phrase = mnemonic.split(' ');
        return state;
      });

      await expect(useStore.getState().onboarding.onboardWallet(mockKey)).rejects.toThrow(
        'already exists',
      );

      // Wallet count should remain unchanged
      expect(localMock.get('wallets')).toHaveLength(1);
    });
  });
});
