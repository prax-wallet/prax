import { Input } from '@repo/ui/components/ui/input';
import { useMemo } from 'react';
import { useStore } from '../../../state';
import { selectOnboardImportPhrase } from '../../../state/onboarding/import-phrase';

export const WordInput = ({ word, index }: { word: string; index: number }) => {
  const { inputSeedPhrase, isWordValid } = useStore(selectOnboardImportPhrase);

  const variant: 'default' | 'success' | 'error' = useMemo(() => {
    if (!word) {
      return 'default';
    }
    return isWordValid(word) ? 'success' : 'error';
  }, [word, isWordValid]);

  return (
    <div className='flex flex-row items-center justify-center gap-2'>
      <div className='w-7 text-right text-base font-bold'>{index + 1}.</div>
      <Input
        variant={variant}
        value={word}
        onChange={({ target: { value } }) => inputSeedPhrase(value, index)}
      />
    </div>
  );
};
