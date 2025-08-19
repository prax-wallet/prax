import { Button } from '@repo/ui/components/ui/button';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { PasswordInput } from '../../shared/components/password-input';
import { usePopupNav } from '../../utils/navigate';
import { useStore } from '../../state';
import { passwordSelector } from '../../state/password';
import { ChangeEvent, FormEvent, useCallback, useState } from 'react';
import { PopupPath } from './paths';
import { needsOnboard } from './popup-needs';
import { useWindowCountdown } from '../../hooks/use-window-countdown';

export const popupLoginLoader = () => needsOnboard();

export const Login = ({
  message = 'Enter password',
  detail,
  onSuccess = nav => nav(PopupPath.INDEX),
  wait = 0,
}: {
  message?: React.ReactNode;
  detail?: React.ReactNode;
  onSuccess?: (nav: ReturnType<typeof usePopupNav>) => void;
  wait?: number;
}) => {
  const navigate = usePopupNav();
  const count = useWindowCountdown(wait);

  const { isPassword, setSessionPassword } = useStore(passwordSelector);
  const [input, setInputValue] = useState('');
  const [enteredIncorrect, setEnteredIncorrect] = useState(false);

  const handleUnlock = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      void isPassword(input).then(async correct => {
        setEnteredIncorrect(!correct);
        if (correct) {
          // save to session state
          await setSessionPassword(input);
          onSuccess(navigate);
        }
      });
    },
    [onSuccess, navigate, isPassword, setSessionPassword, input, setEnteredIncorrect],
  );

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
              <>
                <p className='bg-text-linear bg-clip-text font-headline text-2xl font-bold text-transparent'>
                  {message}
                </p>
                {detail}
              </>
            }
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setInputValue(e.target.value);
              setEnteredIncorrect(false);
            }}
            validations={[
              {
                type: 'error',
                issue: 'wrong password',
                checkFn: () => enteredIncorrect,
              },
            ]}
          />
          <Button
            size='lg'
            variant='gradient'
            disabled={enteredIncorrect || count > 0}
            type='submit'
          >
            Unlock {count > 0 && `(${count})`}
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
