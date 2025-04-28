import { useAddLedgerWallet, useAddSeedPhraseWallet } from '../../../../hooks/onboarding';
import { usePageNav } from '../../../../utils/navigate';
import { FormEvent, useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getSeedPhraseOrigin, setOnboardingValuesInStorage } from './utils';
import { PagePath } from '../../paths';
import { localExtStorage } from '../../../../storage/local';
import { SEED_PHRASE_ORIGIN } from './types';

export const useFinalizeOnboarding = () => {
  const navigate = usePageNav();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const addLedgerWallet = useAddLedgerWallet();
  const addSeedPhraseWallet = useAddSeedPhraseWallet();

  const seedPhraseFrom = getSeedPhraseOrigin(location);

  const addWallet = useMemo(
    () => (seedPhraseFrom === SEED_PHRASE_ORIGIN.NONE ? addLedgerWallet : addSeedPhraseWallet),
    [seedPhraseFrom, addLedgerWallet, addSeedPhraseWallet],
  );

  const handleSubmit = useCallback(async (event: FormEvent, password: string) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError(undefined);
      await addWallet(password);
      await setOnboardingValuesInStorage(seedPhraseFrom);
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
