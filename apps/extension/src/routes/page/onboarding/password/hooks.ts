import { useAddWallet } from '../../../../hooks/onboarding';
import { usePageNav } from '../../../../utils/navigate';
import { FormEvent, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getSeedPhraseOrigin, setOnboardingValuesInStorage } from './utils';
import { PagePath } from '../../paths';
import { localExtStorage } from '../../../../storage/local';

export const useFinalizeOnboarding = () => {
  const addWallet = useAddWallet();
  const navigate = usePageNav();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const handleSubmit = useCallback(async (event: FormEvent, password: string) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError(undefined);
      await addWallet(password);
      const origin = getSeedPhraseOrigin(location);
      await setOnboardingValuesInStorage(origin);
      navigate(PagePath.ONBOARDING_SUCCESS);
    } catch (e) {
      setError(String(e));
      // If something fails, roll back the wallet addition so it forces onboarding if they leave and click popup again
      await localExtStorage.remove('wallets');
    } finally {
      setLoading(false);
    }
  }, []);

  return { handleSubmit, error, loading };
};
