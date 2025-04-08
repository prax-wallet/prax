import { AllSlices, SliceCreator } from '..';
import { OnboardingSlice } from '.';
import {
  isInWordList,
  SeedPhraseLength,
  validateSeedPhrase,
} from '@penumbra-zone/crypto-web/mnemonic';

export interface ImportFields {
  phrase: string[];
  update: (text: string, index: number) => void;
  setLength: (length: SeedPhraseLength) => void;
  wordIsValid: (word: string) => boolean;
  phraseIsValid: () => boolean;
}

export const createImport: SliceCreator<OnboardingSlice['import']> = (set, get) => ({
  phrase: [],
  update: (text, position) => {
    const words = text.trim().split(' ');

    // Extend phrase length if trying to paste in one that's longer
    if (words.length > get().onboarding.import.phrase.length) {
      get().onboarding.import.setLength(SeedPhraseLength.TWENTY_FOUR_WORDS);
    }

    // If attempting to add entire seed phrase, spread through the subsequent fields
    words.slice(0, get().onboarding.import.phrase.length - position).forEach((word, i) => {
      set(state => {
        state.onboarding.import.phrase[position + i] = word;
      });
    });
  },
  setLength: (length: SeedPhraseLength) => {
    const desiredLength = length === SeedPhraseLength.TWELVE_WORDS ? 12 : 24;
    const currLength = get().onboarding.import.phrase.length;

    if (currLength === desiredLength) {
      return;
    }
    if (currLength < desiredLength) {
      set(({ onboarding }) => {
        onboarding.import.phrase = onboarding.import.phrase.concat(
          new Array(desiredLength - currLength).fill(''),
        );
      });
    } else {
      set(({ onboarding }) => {
        onboarding.import.phrase = onboarding.import.phrase.slice(0, desiredLength);
      });
    }
  },
  wordIsValid: word => isInWordList(word),
  phraseIsValid: () => validateSeedPhrase(get().onboarding.import.phrase),
});

export const importSelector = (state: AllSlices) => state.onboarding.import;
