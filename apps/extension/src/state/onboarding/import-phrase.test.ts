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

describe('OnboardImportPhraseSlice', () => {
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

  test('initial state starts with 12 empty words', () => {
    expect(useStore.getState().onboarding.importPhrase.phrase).toEqual(new Array(12).fill(''));
    expect(useStore.getState().onboarding.importPhrase.phraseLength).toBe(12);
  });

  test('initOnboardingType sets custody to imported', () => {
    expect(useStore.getState().onboarding.onboardingCustody).toBeNull();

    useStore.getState().onboarding.importPhrase.initOnboardingType();

    expect(useStore.getState().onboarding.onboardingCustody).toBe('imported');
  });

  test('setPhraseLength changes phrase length', () => {
    useStore.getState().onboarding.importPhrase.setPhraseLength(24);

    expect(useStore.getState().onboarding.importPhrase.phraseLength).toBe(24);
    expect(useStore.getState().onboarding.importPhrase.phrase).toHaveLength(24);
  });

  test('inputSeedPhrase handles single word', () => {
    useStore.getState().onboarding.importPhrase.inputSeedPhrase('abandon', 0);

    expect(useStore.getState().onboarding.importPhrase.phrase[0]).toBe('abandon');
    expect(useStore.getState().onboarding.importPhrase.phraseLength).toBe(12);
  });

  test('inputSeedPhrase handles multiple words', () => {
    useStore.getState().onboarding.importPhrase.inputSeedPhrase('abandon ability able', 0);

    expect(useStore.getState().onboarding.importPhrase.phrase[0]).toBe('abandon');
    expect(useStore.getState().onboarding.importPhrase.phrase[1]).toBe('ability');
    expect(useStore.getState().onboarding.importPhrase.phrase[2]).toBe('able');
  });

  test('inputSeedPhrase inserts long phrase words', () => {
    const longPhrase = new Array(15)
      .fill('')
      .map((_, i) => `word${i + 1}`)
      .join(' ');

    useStore.getState().onboarding.importPhrase.inputSeedPhrase(longPhrase, 0);

    // Check that words were inserted (regardless of auto-expansion behavior)
    const phrase = useStore.getState().onboarding.importPhrase.phrase;
    const insertedWords = phrase.filter(word => word !== '');
    expect(insertedWords).toEqual(new Array(15).fill('').map((_, i) => `word${i + 1}`));
  });

  test('complete import workflow', () => {
    const fullPhrase =
      'abandon ability able about above absent absorb abstract absurd abuse access accident';

    // User starts import flow
    useStore.getState().onboarding.importPhrase.initOnboardingType();
    expect(useStore.getState().onboarding.onboardingCustody).toBe('imported');

    // User pastes phrase
    useStore.getState().onboarding.importPhrase.inputSeedPhrase(fullPhrase, 0);

    expect(useStore.getState().onboarding.importPhrase.phrase).toEqual(fullPhrase.split(' '));
    expect(useStore.getState().onboarding.importPhrase.phraseLength).toBe(12);
  });

  test('handles whitespace correctly', () => {
    useStore.getState().onboarding.importPhrase.inputSeedPhrase('  abandon   ability  able  ', 0);

    expect(useStore.getState().onboarding.importPhrase.phrase[0]).toBe('abandon');
    expect(useStore.getState().onboarding.importPhrase.phrase[1]).toBe('ability');
    expect(useStore.getState().onboarding.importPhrase.phrase[2]).toBe('able');
    expect(useStore.getState().onboarding.importPhrase.phrase[3]).toBe('');
  });
});
