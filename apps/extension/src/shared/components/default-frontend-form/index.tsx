import { SelectList } from '@repo/ui/components/ui/select';
import { AllSlices } from '../../../state';
import { useStoreShallow } from '../../../utils/use-store-shallow';
import { useMemo, useRef } from 'react';
import { Button } from '@repo/ui/components/ui/button';
import { NewFrontendInput } from './new-frontend-input';
import { useIsFocus } from './use-is-focus';
import { extractDomain } from './extract-domain';
import { LoadingList } from '../loading-list';
import { useRegistry } from '../registry';

interface DisplayedFrontend {
  title: string;
  url: string;
}

const useFrontendsList = (selectedRpc?: string) => {
  const { data, isLoading, error } = useRegistry();

  const frontends = (data?.frontends ?? []).map(frontend => ({
    title: extractDomain(frontend),
    url: frontend,
  }));

  if (selectedRpc) {
    frontends.push({
      title: 'Embedded RPC frontend',
      /*NB: we merge using the variadic URL constructor here to avoid double-slashes*/
      url: new URL('/app/', selectedRpc).href,
    });
  }

  return { frontends, isLoading, error };
};

const getIsCustomFrontendSelected = (frontends: DisplayedFrontend[], selected?: string) => {
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

  const inputRef = useRef<HTMLInputElement>(null);
  const isFocused = useIsFocus(inputRef);

  return (
    <SelectList>
      {frontends.map(option => (
        <SelectList.Option
          key={option.url}
          value={option.url}
          secondary={option.url}
          label={option.title}
          isSelected={option.url === selectedFrontend}
          onSelect={selectUrl}
        />
      ))}

      <NewFrontendInput
        key='custom-input'
        ref={inputRef}
        defaultFrontend={selectedFrontend}
        selected={isCustomSelected}
        onSelect={selectUrl}
      />

      <LoadingList isLoading={isLoading} />

      {(isOnboarding ?? isFocused) && (
        <Button
          key='save-button'
          variant='gradient'
          disabled={isOnboarding && !selectedFrontend}
          type={isOnboarding ? 'submit' : 'button'}
        >
          {isOnboarding ? 'Next' : 'Save'}
        </Button>
      )}
      <div className='text-red-400'>{error ? String(error) : null}</div>
    </SelectList>
  );
};
