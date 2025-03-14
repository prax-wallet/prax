import { Button } from '@repo/ui/components/ui/button';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { InputProps } from '@repo/ui/components/ui/input';
import { PasswordInput } from '../../shared/components/password-input';
import { usePopupNav } from '../../utils/navigate';
import { useStore } from '../../state';
import { passwordSelector } from '../../state/password';
import { FormEvent, useState } from 'react';
import { PopupPath } from './paths';
import { needsOnboard } from './popup-needs';

export const popupLoginLoader = () => needsOnboard();

export const Login = () => {
  const navigate = usePopupNav();

  const { isPassword, setSessionPassword } = useStore(passwordSelector);
  const [input, setInputValue] = useState('');
  const [enteredIncorrect, setEnteredIncorrect] = useState(false);

  const handleUnlock = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    void (async function () {
      if (await isPassword(input)) {
        await setSessionPassword(input); // saves to session state
        navigate(PopupPath.INDEX);
      } else {
        setEnteredIncorrect(true);
      }
    })();
  };

  const handleChangePassword: InputProps['onChange'] = e => {
    setInputValue(e.target.value);
    setEnteredIncorrect(false);
  };

  return (
    <FadeTransition className='flex flex-col items-stretch justify-start'>
      <div className='flex h-screen flex-col justify-between p-[30px] pt-10 '>
        <div className='mx-auto my-0 h-[100px] w-[200px]'>
          <img src='/prax-white-vertical.svg' alt='prax logo' />
        </div>
        <form onSubmit={handleUnlock} className='grid gap-4'>
          <PasswordInput
            passwordValue={input}
            label={
              <p className='bg-text-linear bg-clip-text font-headline text-2xl font-bold text-transparent'>
                Enter password
              </p>
            }
            onChange={handleChangePassword}
            validations={[
              {
                type: 'error',
                issue: 'wrong password',
                checkFn: () => enteredIncorrect,
              },
            ]}
          />
          <Button size='lg' variant='gradient' disabled={enteredIncorrect} type='submit'>
            Unlock
          </Button>
        </form>
        <div className='flex flex-col gap-2'>
          <p className='text-center text-muted-foreground'>
            Need help? Contact{' '}
            <a
              className='cursor-pointer text-teal hover:underline'
              target='_blank'
              href='https://discord.com/channels/824484045370818580/1245108769143394457'
              rel='noreferrer'
            >
              Penumbra Support
            </a>
          </p>
        </div>
      </div>
    </FadeTransition>
  );
};
