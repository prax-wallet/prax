import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { BackIcon } from '@repo/ui/components/ui/icons/back-icon';
import { cn } from '@repo/ui/lib/utils';
import { FormEvent, MouseEvent } from 'react';
import { useStore } from '../../../../state';
import { selectOnboardImportPhrase } from '../../../../state/onboarding/import-phrase';
import { usePageNav } from '../../../../utils/navigate';
import { PhraseImportForm } from '../../../../shared/components/seed-phrase/phrase-import-form';
import { PagePath } from '../../paths';

export const ImportSeedPhrase = () => {
  const navigate = usePageNav();
  const { phrase, phraseIsFilled, phraseIsValid } = useStore(selectOnboardImportPhrase);

  const handleSubmit = (event: MouseEvent | FormEvent) => {
    event.preventDefault();
    navigate(PagePath.ONBOARDING_SETUP);
  };

  return (
    <FadeTransition>
      <BackIcon className='float-left mb-4' onClick={() => navigate(-1)} />
      <Card className={cn('p-6', phrase.length === 12 ? 'w-[600px]' : 'w-[816px]')} gradient>
        <CardHeader className='items-center'>
          <CardTitle className='font-semibold'>Import Wallet with Recovery Phrase</CardTitle>
          <CardDescription>
            You can paste your full phrase into the first box and the rest will fill automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className='mt-6 grid gap-4' onSubmit={handleSubmit}>
            <PhraseImportForm />
            <Button
              className='mt-4'
              variant='gradient'
              disabled={!phraseIsFilled || !phraseIsValid}
              onClick={handleSubmit}
            >
              {!phraseIsFilled
                ? 'Fill in passphrase'
                : !phraseIsValid
                  ? 'Phrase is invalid'
                  : 'Import'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </FadeTransition>
  );
};
