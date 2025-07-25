import { create, StoreApi, UseBoundStore } from 'zustand';
import { AllSlices, initializeStore } from '..';
import { beforeEach, describe, expect, test } from 'vitest';
import { SeedPhraseLength } from './mnemonic';
import { localExtStorage } from '@repo/storage-chrome/local';
import { sessionExtStorage } from '@repo/storage-chrome/session';

const localMock = (chrome.storage.local as unknown as { mock: Map<string, unknown> }).mock;
const sessionMock = (chrome.storage.session as unknown as { mock: Map<string, unknown> }).mock;

describe('Generate Slice', () => {
  let useStore: UseBoundStore<StoreApi<AllSlices>>;

  beforeEach(() => {
    localMock.clear();
    sessionMock.clear();
    useStore = create<AllSlices>()(initializeStore(sessionExtStorage, localExtStorage));
  });

  test('the default is empty', () => {
    const { phrase, validationFields, userValidationAttempt } =
      useStore.getState().seedPhrase.generate;
    expect(phrase).toEqual([]);
    expect(validationFields).toEqual([]);
    expect(userValidationAttempt).toEqual([]);
  });

  describe('generateRandomSeedPhrase', () => {
    test('it populates the right fields', () => {
      useStore
        .getState()
        .seedPhrase.generate.generateRandomSeedPhrase(SeedPhraseLength.TWELVE_WORDS);
      const generate = useStore.getState().seedPhrase.generate;
      expect(generate.phrase.length).toBe(12);
      expect(generate.validationFields.length).toBe(3);
      expect(
        generate.validationFields.every(f => generate.phrase[f.index] === f.word),
      ).toBeTruthy();
      expect(generate.userValidationAttempt).toEqual([]);
    });

    test('it works with 24 words too', () => {
      useStore
        .getState()
        .seedPhrase.generate.generateRandomSeedPhrase(SeedPhraseLength.TWENTY_FOUR_WORDS);
      const generate = useStore.getState().seedPhrase.generate;
      expect(generate.phrase.length).toBe(24);
      expect(generate.validationFields.length).toBe(3);
      expect(
        generate.validationFields.every(f => generate.phrase[f.index] === f.word),
      ).toBeTruthy();
      expect(generate.userValidationAttempt).toEqual([]);
    });
  });

  describe('updateAttempt', () => {
    test('can add new', () => {
      useStore.getState().seedPhrase.generate.updateAttempt({ word: 'xyz', index: 10 });
      expect(useStore.getState().seedPhrase.generate.userValidationAttempt[0]?.word).toBe('xyz');

      useStore.getState().seedPhrase.generate.updateAttempt({ word: 'abc', index: 4 });
      expect(useStore.getState().seedPhrase.generate.userValidationAttempt[1]?.word).toBe('abc');
    });

    test('can update existing', () => {
      useStore.getState().seedPhrase.generate.updateAttempt({ word: 'xyz', index: 10 });
      useStore.getState().seedPhrase.generate.updateAttempt({ word: 'abc', index: 4 });
      useStore.getState().seedPhrase.generate.updateAttempt({ word: 'tuv', index: 10 });
      expect(useStore.getState().seedPhrase.generate.userValidationAttempt[0]?.word).toBe('tuv');
    });
  });

  describe('userAttemptCorrect', () => {
    test('detects correct', () => {
      useStore
        .getState()
        .seedPhrase.generate.generateRandomSeedPhrase(SeedPhraseLength.TWELVE_WORDS);
      useStore.getState().seedPhrase.generate.validationFields.forEach(({ word, index }) => {
        useStore.getState().seedPhrase.generate.updateAttempt({ word, index });
      });
      expect(useStore.getState().seedPhrase.generate.userAttemptCorrect()).toBeTruthy();
    });

    test('detects incorrect', () => {
      useStore
        .getState()
        .seedPhrase.generate.generateRandomSeedPhrase(SeedPhraseLength.TWELVE_WORDS);
      useStore.getState().seedPhrase.generate.updateAttempt({ word: 'umlaut', index: 3 });
      expect(useStore.getState().seedPhrase.generate.userAttemptCorrect()).toBeFalsy();
    });
  });
});
