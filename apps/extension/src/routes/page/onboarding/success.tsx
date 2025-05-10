import { useEffect, useRef } from 'react';
import { useStore } from '../../../state';
import { getDefaultFrontend } from '../../../state/default-frontend';

export const OnboardingSuccess = () => {
  const defaultFrontendUrl = useStore(getDefaultFrontend);
  const hasOpened = useRef(false);

  useEffect(() => {
    if (!hasOpened.current && defaultFrontendUrl) {
      hasOpened.current = true;
      window.open(defaultFrontendUrl, '_blank');
      window.close();
    }
  }, [defaultFrontendUrl]);

  return null;
};
