import { useState } from 'react';
import { Button } from '@repo/ui/components/ui/button';
import { PasswordInput } from '../../../shared/components/password-input';
import { useStore } from '../../../state';
import { passwordSelector } from '../../../state/password';
import { SettingsScreen } from './settings-screen';
import { KeyGradientIcon } from '../../../icons/key-gradient';

export const SettingsResetPassword = () => {
  const { isPassword, setPassword: saveNewPassword } = useStore(passwordSelector);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [enteredIncorrect, setEnteredIncorrect] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaved(false);

    void (async function () {
      if (!(await isPassword(currentPassword))) {
        setEnteredIncorrect(true);
        return;
      }

      if (newPassword !== confirmPassword || newPassword.length < 8) {
        return;
      }

      await saveNewPassword(newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaved(true);
    })();
  };

  return (
    <SettingsScreen title='Reset Password' IconComponent={KeyGradientIcon}>
      <form className='flex flex-1 flex-col justify-between gap-6' onSubmit={submit}>
        <div className='flex flex-col gap-3 w-full'>
          <PasswordInput
            passwordValue={currentPassword}
            label={
              <p className='font-headline font-semibold text-muted-foreground'>Current password</p>
            }
            onChange={e => {
              setCurrentPassword(e.target.value);
              setEnteredIncorrect(false);
            }}
            validations={[
              {
                type: 'error',
                issue: 'wrong password',
                checkFn: txt => Boolean(txt) && enteredIncorrect,
              },
            ]}
          />
          <PasswordInput
            passwordValue={newPassword}
            label={
              <p className='font-headline font-semibold text-muted-foreground'>New password</p>
            }
            onChange={e => setNewPassword(e.target.value)}
          />
          <PasswordInput
            passwordValue={confirmPassword}
            label={
              <p className='font-headline font-semibold text-muted-foreground'>
                Confirm new password
              </p>
            }
            onChange={e => setConfirmPassword(e.target.value)}
            validations={[
              {
                type: 'error',
                issue: 'passwords must match',
                checkFn: txt => !!txt && !!newPassword && txt !== newPassword,
              },
            ]}
          />
          {saved && <p className='text-green-400 text-sm mt-2'>Password updated successfully.</p>}
        </div>

        <Button variant='gradient' size='lg' className='w-full' type='submit'>
          Save new password
        </Button>
      </form>
    </SettingsScreen>
  );
};
