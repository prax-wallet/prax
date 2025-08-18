import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/ui/button';
import { CopyToClipboard } from '@repo/ui/components/ui/copy-to-clipboard';
import { assertWalletType } from '@repo/wallet';
import { useCallback, useState } from 'react';
import { FileTextGradientIcon } from '../../../icons/file-text-gradient';
import { PasswordInput } from '../../../shared/components/password-input';
import { useStore } from '../../../state';
import { passwordSelector } from '../../../state/password';
import { getActiveWallet } from '../../../state/wallets';
import { SettingsScreen } from './settings-screen';

export const SettingsPassphrase = () => {
  const wallet = useStore(getActiveWallet);
  const { isPassword, unseal } = useStore(passwordSelector);

  const [passwordInput, setPasswordInput] = useState('');
  const [failure, setFailure] = useState<Error>();
  const [phraseDisplay, setPhraseDisplay] = useState<string[]>();

  const decryptSeedPhrase = useCallback(
    async (password: string) => {
      if (!(await isPassword(password))) {
        throw new Error('Wrong password');
      }
      assertWalletType('encryptedSeedPhrase', wallet);
      const phrase = await unseal(wallet.custodyBox);
      return phrase.split(' ');
    },
    [isPassword, unseal, wallet],
  );

  return (
    <SettingsScreen title='Recovery Passphrase' IconComponent={FileTextGradientIcon}>
      <form
        className='flex flex-1 flex-col items-start justify-between'
        onSubmit={e => {
          e.preventDefault();
          void decryptSeedPhrase(passwordInput).then(setPhraseDisplay, setFailure);
        }}
      >
        <div className='flex flex-col gap-3'>
          <p className='text-muted-foreground'>
            If you change browser or switch to another computer, you will need this recovery
            passphrase to access your accounts.
          </p>
          <p className='mb-3 flex items-center gap-2 text-rust'>
            <ExclamationTriangleIcon /> Don’t share this phrase with anyone
          </p>
          {!phraseDisplay ? (
            <PasswordInput
              passwordValue={passwordInput}
              label={<p className='font-headline font-semibold text-muted-foreground'>Password</p>}
              onChange={e => setPasswordInput(e.target.value)}
              validations={[
                {
                  type: 'error',
                  issue: String(failure),
                  checkFn: () => !!failure,
                },
              ]}
            />
          ) : (
            <div className='flex flex-col gap-2'>
              <p className='font-headline text-base font-semibold'>Recovery Secret Phrase</p>
              <div className='mb-[6px] grid grid-cols-3 gap-4 rounded-lg border bg-background p-5'>
                {phraseDisplay.map((word, i) => (
                  <div className='flex' key={i}>
                    <p className='w-8 text-left text-muted-foreground'>{i + 1}.</p>
                    <p className='text-muted-foreground'>{word}</p>
                  </div>
                ))}
              </div>
              <CopyToClipboard
                text={phraseDisplay.join(' ')}
                label={<span className='font-bold text-muted-foreground'>Copy to clipboard</span>}
                className='m-auto'
                isSuccessCopyText
              />
            </div>
          )}
        </div>
        {!phraseDisplay ? (
          <Button variant='gradient' size='lg' className='w-full' type='submit'>
            Confirm
          </Button>
        ) : (
          <></>
        )}
      </form>
    </SettingsScreen>
  );
};
