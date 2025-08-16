import { Button } from '@repo/ui/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { useState } from 'react';
import { LineWave } from 'react-loader-spinner';
import { PasswordInput } from '../../../../shared/components/password-input';

export const CreatePassword = ({
  attemptPassword,
  pending,
  failure,
}: {
  attemptPassword: (password: string) => Promise<void>;
  pending: boolean;
  failure?: Error;
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmationInput, setConfirmationInput] = useState('');

  const handleSubmit = async (e: React.FormEvent, passwordValue: string) => {
    e.preventDefault();
    if (passwordValue === confirmationInput) {
      await attemptPassword(passwordValue);
    }
  };

  return (
    <>
      <CardHeader className='items-center'>
        <CardTitle>Create Password</CardTitle>
        <CardDescription className='text-center'>
          Your password secures your encrypted data and is needed to unlock your wallet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className='flex flex-col gap-4' onSubmit={e => void handleSubmit(e, passwordInput)}>
          <PasswordInput
            passwordValue={passwordInput}
            label='New password'
            onChange={({ target: { value } }) => setPasswordInput(value)}
          />
          <PasswordInput
            passwordValue={confirmationInput}
            label='Confirm password'
            onChange={({ target: { value } }) => setConfirmationInput(value)}
            validations={[
              {
                type: 'warn',
                issue: "passwords don't match",
                checkFn: (txt: string) => passwordInput !== txt,
              },
            ]}
          />
          <Button
            variant='gradient'
            className='mt-2'
            disabled={passwordInput !== confirmationInput || pending}
            type='submit'
          >
            {pending ? (
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
          {failure && <div className='text-red-600'>{failure.message}</div>}
        </form>
      </CardContent>
    </>
  );
};
