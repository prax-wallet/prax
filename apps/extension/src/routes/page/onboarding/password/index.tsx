import { useState } from 'react';
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
import { LineWave } from 'react-loader-spinner';
import { usePageNav } from '../../../../utils/navigate';
import { PasswordInput } from '../../../../shared/components/password-input';
import { useFinalizeOnboarding } from './hooks';
import { PagePath } from '../../paths';
import { useLocation } from 'react-router-dom';
import { SEED_PHRASE_ORIGIN } from './types';

export const SetPassword = () => {
  const navigate = usePageNav();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const { handleSubmit, error, loading } = useFinalizeOnboarding();

  const location = useLocation();
  const origin = (location.state as { origin?: SEED_PHRASE_ORIGIN })?.origin;

  return (
    <FadeTransition>
      <BackIcon
        className='float-left mb-4'
        onClick={() => {
          if (origin === SEED_PHRASE_ORIGIN.NEWLY_GENERATED) {
            navigate(PagePath.WELCOME);
          } else {
            navigate(-1);
          }
        }}
      />
      <Card className='flex w-[400px] flex-col gap-6' gradient>
        <CardHeader className='items-center'>
          <CardTitle>Create Password</CardTitle>
          <CardDescription className='text-center'>
            Your password secures your encrypted data and is needed to unlock your wallet.
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
