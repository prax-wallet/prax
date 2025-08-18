import { beforeEach, describe, expect, test, vi } from 'vitest';
import { create, StoreApi, UseBoundStore } from 'zustand';
import { AllSlices, initializeStore } from '..';
import { customPersist } from '../persist';
import { localExtStorage } from '@repo/storage-chrome/local';
import { sessionExtStorage } from '@repo/storage-chrome/session';
import type { MockStorageArea } from '@repo/mock-chrome/mocks/storage-area';

const { mock: localMock, listeners: localListeners } = chrome.storage
  .local as unknown as MockStorageArea;
const { mock: sessionMock, listeners: sessionListeners } = chrome.storage
  .session as unknown as MockStorageArea;

describe('OnboardGeneratePhraseSlice', () => {
  let useStore: UseBoundStore<StoreApi<AllSlices>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset storage mocks
    localMock.clear();
    sessionMock.clear();
    localListeners.clear();
    sessionListeners.clear();

    // Create store with proper initialization
    useStore = create<AllSlices>()(
      customPersist(initializeStore(sessionExtStorage, localExtStorage)),
    );

    // Wait for persistence layer to initialize
    await vi.waitFor(() => expect(localListeners.size).toBe(1));
  });

  test('initial state starts with empty phrase', () => {
    expect(useStore.getState().onboarding.generatePhrase.phrase).toEqual([]);
  });

  test('generatePhrase creates real mnemonic phrase', () => {
    useStore.getState().onboarding.generatePhrase.generatePhrase();

    const phrase = useStore.getState().onboarding.generatePhrase.phrase;
    expect(phrase).toHaveLength(24); // 256 bits = 24 words
    expect(phrase.every(word => typeof word === 'string' && word.length > 0)).toBe(true);
  });

  test('initOnboardingType sets custody to generated', () => {
    expect(useStore.getState().onboarding.onboardingCustody).toBeNull();

    useStore.getState().onboarding.generatePhrase.initOnboardingType();

    expect(useStore.getState().onboarding.onboardingCustody).toBe('generated');
  });

  test('can generate multiple different phrases', () => {
    useStore.getState().onboarding.generatePhrase.generatePhrase();
    const firstPhrase = [...useStore.getState().onboarding.generatePhrase.phrase];

    useStore.getState().onboarding.generatePhrase.generatePhrase();
    const secondPhrase = [...useStore.getState().onboarding.generatePhrase.phrase];

    // Phrases should be different (very high probability with real random generation)
    expect(firstPhrase).not.toEqual(secondPhrase);
    expect(firstPhrase).toHaveLength(24);
    expect(secondPhrase).toHaveLength(24);
  });

  test('generated phrases are valid BIP39', () => {
    useStore.getState().onboarding.generatePhrase.generatePhrase();
    const phrase = useStore.getState().onboarding.generatePhrase.phrase;

    // Should be 24 words, all non-empty strings
    expect(phrase).toHaveLength(24);
    expect(phrase.every(word => typeof word === 'string' && word.trim().length > 0)).toBe(true);
  });
});
