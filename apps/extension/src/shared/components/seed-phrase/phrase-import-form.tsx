import { Toggle } from '@repo/ui/components/ui/toggle';
import { cn } from '@repo/ui/lib/utils';
import { useStore } from '../../../state';
import { selectOnboardImportPhrase } from '../../../state/onboarding/import-phrase';
import { WordInput } from './word-input';

export const PhraseImportForm = () => {
  const { phrase, phraseLength, setPhraseLength } = useStore(selectOnboardImportPhrase);

  return (
    <>
      <div className='flex items-center justify-center'>
        <div className='flex gap-3 rounded-lg bg-background p-2'>
          <Toggle onClick={() => setPhraseLength(12)} pressed={phraseLength === 12}>
            12 words
          </Toggle>
          <Toggle onClick={() => setPhraseLength(24)} pressed={phraseLength === 24}>
            24 words
          </Toggle>
        </div>
      </div>
      <div className={cn('grid gap-4', phraseLength === 12 ? 'grid-cols-3' : 'grid-cols-4')}>
        {Array.from({ length: phraseLength }).map((_, i) => (
          <WordInput key={i} word={phrase[i] ?? ''} index={i} />
        ))}
      </div>
    </>
  );
};
