import { AllSlices, useStore } from '../../state';
import { useEffect, useState } from 'react';
import { ServicesMessage } from '../../message/services';
import { SelectList } from '@repo/ui/components/ui/select';
import { bech32mAssetId } from '@penumbra-zone/bech32m/passet';
import { getAssetId } from '@penumbra-zone/getters/metadata';
import { Button } from '@repo/ui/components/ui/button';
import { useNumeraires } from '../../hooks/numeraires-query';

const useNumerairesSelector = (state: AllSlices) => {
  return {
    selectedNumeraires: state.numeraires.selectedNumeraires,
    selectNumeraire: state.numeraires.selectNumeraire,
    saveNumeraires: state.numeraires.saveNumeraires,
  };
};

export const NumeraireForm = ({
  isOnboarding,
  onSuccess,
  chainId,
}: {
  chainId?: string;
  isOnboarding?: boolean;
  onSuccess: () => void;
}) => {
  const { selectedNumeraires, selectNumeraire, saveNumeraires } = useStore(useNumerairesSelector);
  const { numeraires, isLoading, isError } = useNumeraires(chainId);

  // If query errors or there aren't numeraires in the registry, can skip
  useEffect(() => {
    if (isError || (!isLoading && numeraires.length === 0)) {
      onSuccess();
    }
  }, [numeraires.length, isError, isLoading]);

  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    void (async function () {
      await saveNumeraires();
      void chrome.runtime.sendMessage(ServicesMessage.ChangeNumeraires);
      onSuccess();
    })();
  };

  return (
    <div className='flex flex-col gap-2'>
      <form className='flex flex-col gap-4' onSubmit={handleSubmit}>
        <SelectList>
          {numeraires.map(metadata => {
            // Image default is "" and thus cannot do nullish-coalescing
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            const icon = metadata.images[0]?.png || metadata.images[0]?.svg;
            return (
              <SelectList.Option
                key={bech32mAssetId(getAssetId(metadata))}
                value={getAssetId(metadata).toJsonString()}
                label={metadata.symbol}
                isSelected={selectedNumeraires.includes(getAssetId(metadata).toJsonString())}
                onSelect={() => selectNumeraire(getAssetId(metadata).toJsonString())}
                image={
                  !!icon && (
                    <img
                      src={icon}
                      className='size-full object-contain'
                      alt='rpc endpoint brand image'
                    />
                  )
                }
              />
            );
          })}

          <Button
            className='my-5'
            key='save-button'
            variant='gradient'
            type='submit'
            disabled={loading}
            onClick={handleSubmit}
          >
            {isOnboarding ? 'Next' : loading ? 'Saving...' : 'Save'}
          </Button>
        </SelectList>
      </form>
    </div>
  );
};
