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
import { cn } from '@repo/ui/lib/utils';
import { useStore } from '../../../state';
import { importSelector } from '../../../state/seed-phrase/import';
import { usePageNav } from '../../../utils/navigate';
import { ImportForm } from '../../../shared/containers/import-form';
import { FormEvent, MouseEvent } from 'react';
import { navigateToPasswordPage } from './password/utils';
import { SEED_PHRASE_ORIGIN } from './password/types';

export const ImportSeedPhrase = () => {
  const navigate = usePageNav();
  const { phrase, phraseIsValid } = useStore(importSelector);

  const handleSubmit = (event: MouseEvent | FormEvent) => {
    event.preventDefault();
    navigateToPasswordPage(navigate, SEED_PHRASE_ORIGIN.IMPORTED);
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
            <ImportForm />
            <Button
              className='mt-4'
              variant='gradient'
              disabled={!phrase.every(w => w.length > 0) || !phraseIsValid()}
              onClick={handleSubmit}
            >
              {!phrase.length || !phrase.every(w => w.length > 0)
                ? 'Fill in passphrase'
                : !phraseIsValid()
                  ? 'Phrase is invalid'
                  : 'Import'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </FadeTransition>
  );
};
