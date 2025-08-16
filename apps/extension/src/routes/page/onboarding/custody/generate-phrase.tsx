import { useEffect } from 'react';
import { useStore } from '../../../../state';
import { usePageNav } from '../../../../utils/navigate';
import { selectOnboardingGenerated } from '../../../../state/onboarding/generate-phrase';
import { PagePath } from '../../paths';

export const GenerateSeedPhrase = () => {
  const navigate = usePageNav();
  const { generatePhrase } = useStore(selectOnboardingGenerated);

  useEffect(() => {
    generatePhrase();
    navigate(PagePath.ONBOARDING_SETUP);
  }, [generatePhrase]);

  return null;
};
