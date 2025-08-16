import { generateMnemonic } from 'bip39';
import { AllSlices, SliceCreator } from '..';

export interface OnboardGeneratePhraseSlice {
  phrase: string[];
  initOnboardingType: () => void;
  generatePhrase: () => void;
}

export const createOnboardGeneratePhraseSlice: SliceCreator<OnboardGeneratePhraseSlice> = set => ({
  phrase: [],
  initOnboardingType: () => {
    set(state => {
      state.onboarding.onboardingCustody = 'generated';
    });
  },
  generatePhrase: () => {
    set(state => {
      state.onboarding.generatePhrase.phrase = generateMnemonic(256).split(' ');
    });
  },
});

export const selectOnboardingGenerated = (state: AllSlices) => {
  const { phrase, generatePhrase, initOnboardingType } = state.onboarding.generatePhrase;
  initOnboardingType();
  return { phrase, generatePhrase };
};
