import { SeedPhraseLength } from '@penumbra-zone/crypto-web/mnemonic';
import { useEffect } from 'react';
import { useStore } from '../../../state';
import { generateSelector } from '../../../state/seed-phrase/generate';
import { usePageNav } from '../../../utils/navigate';
import { SEED_PHRASE_ORIGIN } from './password/types';
import { navigateToPasswordPage } from './password/utils';

export const GenerateSeedPhrase = () => {
  const navigate = usePageNav();
  const { phrase, generateRandomSeedPhrase } = useStore(generateSelector);

  // On render, asynchronously generate a new seed phrase
  useEffect(() => {
    if (!phrase.length) {
      generateRandomSeedPhrase(SeedPhraseLength.TWELVE_WORDS);
    }
  }, [generateRandomSeedPhrase, phrase.length]);

  useEffect(() => {
    if (phrase.length === Number(SeedPhraseLength.TWELVE_WORDS)) {
      navigateToPasswordPage(navigate, SEED_PHRASE_ORIGIN.NEWLY_GENERATED);
    }
  }, [phrase.length, navigate]);

  return null;
};
