import { useMemo, useRef, useState } from 'react';
import type { EntityMetadata } from '@penumbra-labs/registry';
import { SelectList } from '@repo/ui/components/ui/select';
import { Button } from '@repo/ui/components/ui/button';
import { AllSlices } from '../../../state';
import { useStoreShallow } from '../../../utils/use-store-shallow';
import { NewFrontendInput } from './new-frontend-input';
import { LoadingList } from '../loading-list';
import { useRegistry } from '../registry';

const useFrontendsList = (selectedRpc?: string) => {
  const { data, isLoading, error } = useRegistry();

  const frontends = useMemo(() => {
    const arr: EntityMetadata[] = data?.frontends ?? [];

    if (selectedRpc) {
      return [
        ...arr,
        {
          name: 'Embedded RPC frontend',
          /* we merge using the variadic URL constructor here to avoid double-slashes*/
          url: new URL('/app/', selectedRpc).href,
          images: [],
        },
      ];
    }

    return arr;
  }, [data]);

  return { frontends, isLoading, error };
};

const getIsCustomFrontendSelected = (frontends: EntityMetadata[], selected?: string) => {
  return !!selected && !frontends.some(item => item.url === selected);
};

const useDefaultFrontendSelector = (state: AllSlices) => {
  return {
    selectedFrontend: state.defaultFrontend.url,
    selectUrl: state.defaultFrontend.setUrl,
    selectedRpc: state.network.grpcEndpoint,
  };
};

export const DefaultFrontendForm = ({ isOnboarding }: { isOnboarding?: boolean }) => {
  const { selectedFrontend, selectUrl, selectedRpc } = useStoreShallow(useDefaultFrontendSelector);
  const { frontends, isLoading, error } = useFrontendsList(selectedRpc);
  const isCustomSelected = useMemo(
    () => getIsCustomFrontendSelected(frontends, selectedFrontend),
    [frontends, selectedFrontend],
  );
  const [label, setLabel] = useState('Save');

  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    setLabel('Saved!');
    setTimeout(() => setLabel('Save'), 3000);
  };

  return (
    <SelectList>
      {frontends.map(option => {
        const imageUrl = option.images[0]?.svg ?? option.images[0]?.png;
        return (
          <SelectList.Option
            key={option.url}
            value={option.url}
            secondary={option.url}
            label={option.name}
            isSelected={option.url === selectedFrontend}
            onSelect={selectUrl}
            image={
              !!imageUrl && (
                <img
                  src={imageUrl}
                  className='size-full object-contain'
                  alt='rpc endpoint brand image'
                />
              )
            }
          />
        );
      })}

      <NewFrontendInput
        key='custom-input'
        ref={inputRef}
        defaultFrontend={selectedFrontend}
        selected={isCustomSelected}
        onSelect={selectUrl}
      />

      <LoadingList isLoading={isLoading} />

      <div className='sticky bottom-0 left-0 right-0 w-full backdrop-blur-md bg-background/70 border-t z-10 mt-4 pb-[15px]'>
        <Button
          key='save-button'
          variant='gradient'
          disabled={!selectedFrontend}
          type={isOnboarding ? 'submit' : 'button'}
          className='w-full'
          onClick={handleClick}
        >
          {isOnboarding ? 'Next' : label}
        </Button>
      </div>
      <div className='text-red-400'>{error ? String(error) : null}</div>
    </SelectList>
  );
};
