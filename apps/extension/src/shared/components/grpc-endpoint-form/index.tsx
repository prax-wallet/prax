import { FormEvent, useRef } from 'react';
import { SelectList } from '@repo/ui/components/ui/select';
import { Button } from '@repo/ui/components/ui/button';
import { Network, Loader2 } from 'lucide-react';
import { useGrpcEndpointForm } from './use-grpc-endpoint-form';
import { ConfirmChangedChainIdDialog } from './confirm-changed-chain-id-dialog';
import { ChainIdOrError } from './chain-id-or-error';
import { LoadingList } from '../loading-list';

/**
 * Renders all the parts of the gRPC endpoint form that are shared between the
 * onboarding flow and the RPC settings page.
 */
export const GrpcEndpointForm = ({
  submitButtonLabel,
  isOnboarding,
  onSuccess,
  beforeSubmit,
}: {
  submitButtonLabel: string;
  isOnboarding: boolean;
  onSuccess: () => void | Promise<void>;
  beforeSubmit?: (proposedEndpoint: string) => void | Promise<void>;
}) => {
  const {
    chainId,
    chainIdChanged,
    confirmChangedChainIdPromise,
    originalChainId,
    grpcEndpointsQuery,
    grpcEndpointInput,
    setGrpcEndpointInput,
    onSubmit,
    rpcError,
    isSubmitButtonEnabled,
    isCustomGrpcEndpoint,
    isValidationLoading,
  } = useGrpcEndpointForm(isOnboarding);
  const customGrpcEndpointInput = useRef<HTMLInputElement | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitButtonEnabled) {
      void onSubmit({ beforeSubmit, onSuccess });
    }
  };

  return (
    <>
      <div className='flex flex-col gap-2'>
        <form className='flex flex-col gap-4 mt-[-8px]' onSubmit={handleSubmit}>
          <SelectList>
            {grpcEndpointsQuery.rpcs.map(option => {
              const imageUrl = option.images[0]?.svg ?? option.images[0]?.png;
              return (
                <SelectList.Option
                  key={option.url}
                  label={option.name}
                  secondary={option.url}
                  onSelect={setGrpcEndpointInput}
                  value={option.url}
                  isSelected={option.url === grpcEndpointInput}
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

            <SelectList.Option
              label='Custom RPC'
              secondary={
                <input
                  type='url'
                  placeholder='Enter URL'
                  ref={customGrpcEndpointInput}
                  value={isCustomGrpcEndpoint && !!grpcEndpointInput ? grpcEndpointInput : ''}
                  onChange={e => setGrpcEndpointInput(e.target.value)}
                  className='w-full rounded border border-secondary bg-background p-1 outline-0 transition hover:border-gray-400 focus:border-gray-400'
                />
              }
              onSelect={() => {
                if (!isCustomGrpcEndpoint) {
                  setGrpcEndpointInput('');
                }
                customGrpcEndpointInput.current?.focus();
              }}
              isSelected={isCustomGrpcEndpoint}
              image={<Network className='size-full' />}
            />
          </SelectList>

          <LoadingList isLoading={grpcEndpointsQuery.isLoading} />

          <div className='sticky bottom-0 left-0 right-0 w-full backdrop-blur-md bg-background/70 border-t z-10 mt-4 pb-[10px]'>
            <Button
              variant='gradient'
              type='submit'
              disabled={!isSubmitButtonEnabled}
              className='w-full'
            >
              {isValidationLoading ? (
                <>
                  <Loader2 className='mr-2 size-4 animate-spin' />
                  Validating RPC
                </>
              ) : (
                submitButtonLabel
              )}
            </Button>
          </div>
        </form>

        <ChainIdOrError chainId={chainId} chainIdChanged={chainIdChanged} error={rpcError} />
        <div className='text-red-400'>
          {grpcEndpointsQuery.error ? String(grpcEndpointsQuery.error) : null}
        </div>
      </div>

      <ConfirmChangedChainIdDialog
        chainId={chainId}
        originalChainId={originalChainId}
        promiseWithResolvers={confirmChangedChainIdPromise}
      />
    </>
  );
};
