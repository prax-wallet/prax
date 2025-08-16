import { Button } from '@repo/ui/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { useState } from 'react';
import { LineWave } from 'react-loader-spinner';
import { PasswordInput } from '../../../../shared/components/password-input';

export const ConfirmPassword = ({
  attemptPassword,
  pending,
  failure,
}: {
  attemptPassword: (password: string) => Promise<void>;
  pending: boolean;
  failure?: Error;
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  const handleSubmit = async (e: React.FormEvent, passwordValue: string) => {
    e.preventDefault();
    await attemptPassword(passwordValue);
  };

  return (
    <>
      <CardHeader className='items-center'>
        <CardTitle>Confirm Password</CardTitle>
        <CardDescription className='text-center'>
          Confirm your existing password to establish a new wallet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className='flex flex-col gap-4'
          onSubmit={e => void handleSubmit(e, confirmationInput)}
        >
          <PasswordInput
            passwordValue={confirmationInput}
            label='Confirm password'
            onChange={({ target: { value } }) => setConfirmationInput(value)}
          />
          <Button variant='gradient' className='mt-2' disabled={pending} type='submit'>
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
