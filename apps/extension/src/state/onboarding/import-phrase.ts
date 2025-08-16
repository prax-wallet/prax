import { validateMnemonic, wordlists } from 'bip39';
import { AllSlices, SliceCreator } from '..';

const wordlist = wordlists['EN']!;

export interface OnboardImportPhraseSlice {
  phrase: string[];
  phraseLength: 12 | 24;
  initOnboardingType: () => void;
  setPhraseLength: (length: 12 | 24) => void;
  inputSeedPhrase: (text: string, index: number) => void;
}

export const createOnboardImportPhraseSlice: SliceCreator<OnboardImportPhraseSlice> = (
  set,
  get,
) => ({
  phrase: new Array<string>(12).fill(''),
  phraseLength: 12,

  initOnboardingType: () => {
    set(state => {
      state.onboarding.onboardingCustody = 'imported';
    });
  },

  setPhraseLength: (phraseLength: 12 | 24) => {
    const { phrase: existingPhrase } = get().onboarding.importPhrase;

    const phrase = new Array<string>(phraseLength).map((_, i) => existingPhrase[i] ?? '');

    set(state => {
      state.onboarding.importPhrase.phraseLength = phraseLength;
      state.onboarding.importPhrase.phrase = phrase;
    });
  },

  inputSeedPhrase: (text: string, position: number) => {
    const { phrase: existingPhrase } = get().onboarding.importPhrase;
    const words = text
      .trim()
      .split(' ')
      .filter((word: string) => !!word);

    const phrase = existingPhrase.toSpliced(position, words.length, ...words);
    const phraseLength = phrase.length > 12 ? 24 : 12;

    set(state => {
      state.onboarding.importPhrase.phraseLength = phraseLength;
      state.onboarding.importPhrase.phrase = phrase.slice(0, phraseLength);
    });
  },
});

export const selectOnboardImportPhrase = (state: AllSlices) => {
  const { phrase, phraseLength, setPhraseLength, inputSeedPhrase, initOnboardingType } =
    state.onboarding.importPhrase;

  initOnboardingType();

  const phraseIsFilled = !!phrase.length && phrase.every(w => !!w);
  const phraseIsValid = phraseIsFilled && validateMnemonic(phrase.join(' '));

  return {
    phrase,
    phraseLength,
    setPhraseLength,
    inputSeedPhrase,

    phraseIsFilled,
    phraseIsValid,

    isWordValid: (word: string) => wordlist.includes(word),
  };
};
