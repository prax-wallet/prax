import { create, StoreApi, UseBoundStore } from 'zustand';
import { AllSlices, initializeStore } from '.';
import { beforeEach, describe, expect, test } from 'vitest';
import { sessionExtStorage } from '@repo/storage-chrome/session';
import { localExtStorage } from '@repo/storage-chrome/local';
import { Key, KeyPrint } from '@repo/wallet/encryption';

const localMock = (chrome.storage.local as unknown as { mock: Map<string, unknown> }).mock;
const sessionMock = (chrome.storage.session as unknown as { mock: Map<string, unknown> }).mock;

describe('Password Slice', () => {
  const password = 's0meUs3rP@ssword';
  const seedPhrase = [
    'advance twist canal impact field normal depend pink sick horn world broccoli',
  ];

  let useStore: UseBoundStore<StoreApi<AllSlices>>;

  beforeEach(() => {
    localMock.clear();
    sessionMock.clear();
    useStore = create<AllSlices>()(initializeStore(sessionExtStorage, localExtStorage));
  });

  test('password cannot be verified without a KeyPrint', async () => {
    await expect(useStore.getState().password.isPassword(password)).rejects.toThrow();
  });

  test('password can be set and verified', async () => {
    await useStore.getState().password.setPassword(password);
    await useStore.getState().wallets.addWallet({
      label: 'Account #1',
      seedPhrase,
    });

    // Saves to session storage
    const sessionKey = await sessionExtStorage.get('passwordKey');
    expect(sessionKey).toBeTruthy();
    await expect(Key.fromJson(sessionKey!)).resolves.not.toThrow();

    // Saves to local storage
    const localPrint = await localExtStorage.get('passwordKeyPrint');
    expect(localPrint).toBeTruthy();
    expect(() => KeyPrint.fromJson(localPrint!)).not.toThrow();

    // Slice method works
    expect(await useStore.getState().password.isPassword(password)).toBeTruthy();
    expect(await useStore.getState().password.isPassword('wrong password')).toBeFalsy();
  });

  test('password key can be set to session storage', async () => {
    await useStore.getState().password.setPassword(password);
    await useStore.getState().wallets.addWallet({
      label: 'Account #1',
      seedPhrase,
    });

    useStore.getState().password.clearSessionPassword();
    const sessionKeyAfterLogout = await sessionExtStorage.get('passwordKey');
    expect(sessionKeyAfterLogout).toBeFalsy();

    await useStore.getState().password.setSessionPassword(password);

    const sessionKeyAfterLogin = await sessionExtStorage.get('passwordKey');
    expect(sessionKeyAfterLogin).toBeTruthy();
    await expect(Key.fromJson(sessionKeyAfterLogin!)).resolves.not.toThrow();
  });
});
