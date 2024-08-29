import { ExclamationTriangleIcon, LockClosedIcon } from '@radix-ui/react-icons';
import { SeedPhraseLength } from '@penumbra-zone/crypto-web/mnemonic';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@repo/ui/components/ui/button';
import { BackIcon } from '@repo/ui/components/ui/icons/back-icon';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { CopyToClipboard } from '@repo/ui/components/ui/copy-to-clipboard';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { Input } from '@repo/ui/components/ui/input';
import { cn } from '@repo/ui/lib/utils';
import { useCountdown } from 'usehooks-ts';
import { useStore } from '../../../state';
import { generateSelector } from '../../../state/seed-phrase/generate';
import { usePageNav } from '../../../utils/navigate';
import { PagePath } from '../paths';
import { WordLengthToogles } from '../../../shared/containers/word-length-toogles';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { fetchBlockHeight } from '../../../hooks/full-sync-height';
import { localExtStorage } from '../../../storage/local';
import { sample } from 'lodash';

const fetchBlockHeightWithFallback = async (endpoints: string[]): Promise<number> => {
  if (endpoints.length === 0) {
    throw new Error('All RPC endpoints failed to fetch the block height.');
  }

  // Randomly select an rpc endpoint from the chain registry
  const randomEndpoint = sample(endpoints);

  try {
    const walletCreationBlockHeight = await fetchBlockHeight(randomEndpoint!);
    if (walletCreationBlockHeight !== undefined) {
      return walletCreationBlockHeight;
    } else {
      // Remove the current endpoint from the list and try again
      const remainingEndpoints = endpoints.filter(endpoint => endpoint !== randomEndpoint);
      return fetchBlockHeightWithFallback(remainingEndpoints);
    }
  } catch (error) {
    const remainingEndpoints = endpoints.filter(endpoint => endpoint !== randomEndpoint);
    return fetchBlockHeightWithFallback(remainingEndpoints);
  }
};

export const GenerateSeedPhrase = () => {
  const navigate = usePageNav();
  const { phrase, generateRandomSeedPhrase } = useStore(generateSelector);
  const [count, { startCountdown }] = useCountdown({ countStart: 3 });
  const [reveal, setReveal] = useState(false);
  const [blockHeight, setBlockHeight] = useState<number | null>(null);

  // On render, generate a new seed phrase.
  // Fetch data only once on the initial render.
  const isFetchedRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      if (isFetchedRef.current) {
        return;
      }

      try {
        const chainRegistryClient = new ChainRegistryClient();
        const { rpcs } = chainRegistryClient.bundled.globals();

        const suggestedEndpoints = rpcs.map(i => i.url);
        const blockHeight = await fetchBlockHeightWithFallback(suggestedEndpoints);
        await localExtStorage.set('walletCreationBlockHeight', blockHeight);
        setBlockHeight(blockHeight);

        isFetchedRef.current = true;
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (!phrase.length) {
      generateRandomSeedPhrase(SeedPhraseLength.TWELVE_WORDS);
    }
    startCountdown();

    // Fetch RPCs and block height asynchronously
    void fetchData();
  }, [phrase.length, generateRandomSeedPhrase, startCountdown]);

  return (
    <FadeTransition>
      <BackIcon className='float-left mb-4' onClick={() => navigate(-1)} />
      <Card className={cn(phrase.length === 12 ? 'w-[600px]' : 'w-[816px]')} gradient>
        <CardHeader className='items-center'>
          <CardTitle className='font-semibold'>New Recovery Phrase</CardTitle>
        </CardHeader>
        <CardContent className='mt-6 grid gap-4'>
          <div className={cn('grid gap-4', !reveal && 'blur')}>
            <WordLengthToogles toogleClick={generateRandomSeedPhrase} phrase={phrase} />
            <div
              className={cn(
                'grid gap-4 mt-2',
                phrase.length === 12 ? 'grid-cols-3' : 'grid-cols-4',
              )}
            >
              {phrase.map((word, i) => (
                <div className='flex flex-row items-center justify-center gap-2' key={i}>
                  <div className='w-7 text-right text-base font-bold'>{i + 1}.</div>
                  <Input readOnly value={word} className='text-[15px] font-normal leading-[22px]' />
                </div>
              ))}
            </div>
            <CopyToClipboard
              disabled={!reveal}
              text={phrase.join(' ')}
              label={<span className='font-bold text-muted-foreground'>Copy to clipboard</span>}
              className='m-auto w-48'
              isSuccessCopyText
            />
          </div>

          {reveal && (
            <div className='mt-4 rounded-lg border border-gray-500 bg-gray-800 p-4 shadow-sm'>
              <h4 className='text-lg font-semibold text-gray-200'>Important!</h4>
              <p className='mt-2 text-gray-300'>
                Block Height:{' '}
                <span className='font-bold text-gray-100'>{blockHeight ?? 'Loading...'}</span>
              </p>
              <p className='mt-2 text-sm text-gray-400'>
                Please save the wallet creation height along with your recovery passphrase. It will
                help you restore your wallet more quickly!
              </p>
            </div>
          )}

          <div className='mt-2 flex flex-col justify-center gap-4'>
            <div className='flex flex-col gap-1'>
              <p className='flex items-center gap-2 text-rust'>
                <ExclamationTriangleIcon /> Do not share this with anyone
              </p>
              <p>
                Never share your recovery passphrase with anyone, not even Penumbra employees. Your
                phrase grants full access to your funds.
              </p>
            </div>
            <div className='flex flex-col gap-1'>
              <p className='flex items-center gap-2 text-teal'>
                <LockClosedIcon /> Back this up safely
              </p>
              <p>
                Save to a password manager or keep it in a bank vault. Without the backup, you
                cannot recover your account.
              </p>
            </div>
          </div>

          {reveal ? (
            <Button
              className='mt-4'
              variant='gradient'
              onClick={() => navigate(PagePath.CONFIRM_BACKUP)}
              disabled={count !== 0}
            >
              I have backed this up
            </Button>
          ) : (
            <Button
              className='mt-4'
              variant='gradient'
              onClick={() => setReveal(true)}
              disabled={count !== 0}
            >
              Reveal phrase {count !== 0 && `(${count})`}
            </Button>
          )}
        </CardContent>
      </Card>
    </FadeTransition>
  );
};
