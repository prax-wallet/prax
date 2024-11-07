import { FormEvent, useCallback, useState } from 'react';
import { BackIcon } from '@repo/ui/components/ui/icons/back-icon';
import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { usePageNav } from '../../../utils/navigate';
import { PasswordInput } from '../../../shared/components/password-input';
import { LineWave } from 'react-loader-spinner';
import { useAddWallet } from '../../../hooks/onboarding';
import { setOnboardingValuesInStorage } from '../../../hooks/latest-block-height';
import { PagePath } from '../paths';
import { Location, useLocation } from 'react-router-dom';

const useFinalizeOnboarding = () => {
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
    } finally {
      setLoading(false);
    }
  }, []);

  return { handleSubmit, error, loading };
};

export enum SEED_PHRASE_ORIGIN {
  IMPORTED = 'IMPORTED',
  NEWLY_GENERATED = 'NEWLY_GENERATED',
}

interface LocationState {
  origin?: SEED_PHRASE_ORIGIN;
}

const getSeedPhraseOrigin = (location: Location): SEED_PHRASE_ORIGIN => {
  const state = location.state as Partial<LocationState> | undefined;
  if (
    state &&
    typeof state.origin === 'string' &&
    Object.values(SEED_PHRASE_ORIGIN).includes(state.origin)
  ) {
    return state.origin;
  }
  // Default to IMPORTED if the origin is not valid as it won't generate a walletCreationHeight
  return SEED_PHRASE_ORIGIN.IMPORTED;
};

export const navigateToPasswordPage = (
  nav: ReturnType<typeof usePageNav>,
  origin: SEED_PHRASE_ORIGIN,
) => nav(PagePath.SET_PASSWORD, { state: { origin } });

export const SetPassword = () => {
  const navigate = usePageNav();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const { handleSubmit, error, loading } = useFinalizeOnboarding();

  return (
    <FadeTransition>
      <BackIcon className='float-left mb-4' onClick={() => navigate(-1)} />
      <Card className='flex w-[400px] flex-col gap-6' gradient>
        <CardHeader className='items-center'>
          <CardTitle>Create a password</CardTitle>
          <CardDescription className='text-center'>
            We will use this password to encrypt your data and you&apos;ll need it to unlock your
            wallet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className='flex flex-col gap-4' onSubmit={e => void handleSubmit(e, password)}>
            <PasswordInput
              passwordValue={password}
              label='New password'
              onChange={({ target: { value } }) => setPassword(value)}
            />
            <PasswordInput
              passwordValue={confirmation}
              label='Confirm password'
              onChange={({ target: { value } }) => setConfirmation(value)}
              validations={[
                {
                  type: 'warn',
                  issue: "passwords don't match",
                  checkFn: (txt: string) => password !== txt,
                },
              ]}
            />
            <Button
              variant='gradient'
              className='mt-2'
              disabled={password !== confirmation || loading}
              type='submit'
            >
              {loading ? (
                <LineWave
                  visible={true}
                  height='60'
                  width='60'
                  color='#FFFFFF'
                  wrapperClass='mt-[-17.5px] mr-[-21px]'
                />
              ) : (
                'Next'
              )}
            </Button>
            {error && <div className='text-red-600'>{error}</div>}
          </form>
        </CardContent>
      </Card>
    </FadeTransition>
  );
};
