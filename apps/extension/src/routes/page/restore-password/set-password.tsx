import { FormEvent, useState } from 'react';
import { Button } from '@repo/ui/components/ui/button';
import { BackIcon } from '@repo/ui/components/ui/icons/back-icon';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { useOnboardingSave } from '../../../hooks/onboarding';
import { usePageNav } from '../../../utils/navigate';
import { PagePath } from '../paths';
import { PasswordInput } from '../../../shared/components/password-input';

export const SetPassword = () => {
  const navigate = usePageNav();
  const finalOnboardingSave = useOnboardingSave();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void (async function () {
      await finalOnboardingSave(password);
      navigate(PagePath.ONBOARDING_SUCCESS);
    })();
  };

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
          <form className='flex flex-col gap-4' onSubmit={handleSubmit}>
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
              disabled={password !== confirmation}
              type='submit'
            >
              Next
            </Button>
          </form>
        </CardContent>
      </Card>
    </FadeTransition>
  );
};
