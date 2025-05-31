import { useEffect, useRef } from 'react';
import { DEFAULT_LANDING_PAGE } from './constants';

export const OnboardingSuccess = () => {
  const hasOpened = useRef(false);

  useEffect(() => {
    if (!hasOpened.current) {
      hasOpened.current = true;
      window.open(DEFAULT_LANDING_PAGE, '_blank');
      window.close();
    }
  }, [DEFAULT_LANDING_PAGE]);

  return null;
};
