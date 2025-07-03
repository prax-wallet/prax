import { beforeEach, describe, expect, it } from 'vitest';
import { create, StoreApi, UseBoundStore } from 'zustand';
import { AllSlices, initializeStore } from '.';
import { localExtStorage } from '@repo/storage-chrome/local';
import { sessionExtStorage } from '@repo/storage-chrome/session';

const localMock = (chrome.storage.local as unknown as { mock: Map<string, unknown> }).mock;
const sessionMock = (chrome.storage.session as unknown as { mock: Map<string, unknown> }).mock;

describe('Default Frontend Slice', () => {
  let useStore: UseBoundStore<StoreApi<AllSlices>>;

  beforeEach(() => {
    localMock.clear();
    sessionMock.clear();
    useStore = create<AllSlices>()(initializeStore(sessionExtStorage, localExtStorage));
  });

  it('populates the local storage correctly', () => {
    expect(useStore.getState().defaultFrontend.url).toBeUndefined();
  });

  it('sets the value of default frontend correctly', async () => {
    const testUrl = 'https://example.com';
    useStore.getState().defaultFrontend.setUrl(testUrl);
    expect(useStore.getState().defaultFrontend.url).toBe(testUrl);

    const urlFromChromeStorage = await localExtStorage.get('frontendUrl');
    expect(urlFromChromeStorage).toBe(testUrl);
  });
});
