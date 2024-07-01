import { AllSlices, useStore } from '../../state';
import { useChainIdQuery } from '../../hooks/chain-id';
import { useEffect, useMemo, useState } from 'react';
import { ServicesMessage } from '../../message/services';
import { SelectList } from '@repo/ui/components/ui/select';
import { bech32mAssetId } from '@penumbra-zone/bech32m/passet';
import { getAssetId } from '@penumbra-zone/getters/metadata';
import { Button } from '@repo/ui/components/ui/button';
import { getNumeraireFromRegistry } from '../../utils/get-numeraires-from-registry';

const useNumerairesSelector = (state: AllSlices) => {
  return {
    selectedNumeraires: state.numeraires.selectedNumeraires,
    selectNumeraire: state.numeraires.selectNumeraire,
    saveNumeraires: state.numeraires.saveNumeraires,
    networkChainId: state.network.chainId,
  };
};

export const NumeraireForm = ({
  isOnboarding,
  onSuccess,
}: {
  isOnboarding?: boolean;
  onSuccess: () => void | Promise<void>;
}) => {
  const { chainId } = useChainIdQuery();
  const { selectedNumeraires, selectNumeraire, saveNumeraires, networkChainId } =
    useStore(useNumerairesSelector);

  // 'chainId' from 'useChainIdQuery' is not available during onboarding,
  // this forces you to use two sources to guarantee 'chainId' for both settings and onboarding
  const numeraires = useMemo(() => getNumeraireFromRegistry(chainId ?? networkChainId), [chainId]);

  useEffect(() => {
    if (numeraires.length === 0) {
      void onSuccess();
    }
  }, [numeraires]);

  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    void (async function () {
      await saveNumeraires();
      await chrome.runtime.sendMessage(ServicesMessage.ChangeNumeraires);
      await onSuccess();
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
