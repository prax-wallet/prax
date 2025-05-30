import { Code, ConnectError, createClient } from '@connectrpc/connect';
import { AppService } from '@penumbra-zone/protobuf';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AllSlices } from '../../../state';
import { useStoreShallow } from '../../../utils/use-store-shallow';
import { ServicesMessage } from '../../../message/services';
import debounce from 'lodash/debounce';
import { randomSort } from '../../utils/random-sort';
import { isValidUrl } from '../../utils/is-valid-url';
import { useRegistry } from '../registry';

const useSaveGrpcEndpointSelector = (state: AllSlices) => ({
  grpcEndpoint: state.network.grpcEndpoint,
  chainId: state.network.chainId,
  setGrpcEndpoint: state.network.setGRPCEndpoint,
  clearWalletCreationHeight: state.network.clearWalletCreationHeight,
  clearCompactFrontierBlockHeight: state.network.clearCompactFrontierBlockHeight,
  setChainId: state.network.setChainId,
});

const useRpcs = () => {
  const { data, isLoading, error } = useRegistry();

  const rpcs = useMemo(() => {
    return data?.rpcs.toSorted(randomSort) ?? [];
  }, [data]);

  return { rpcs, isLoading, error };
};

export const useGrpcEndpointForm = (isOnboarding: boolean) => {
  const grpcEndpointsQuery = useRpcs();

  // Get the rpc set in storage (if present)
  const {
    grpcEndpoint,
    chainId,
    setGrpcEndpoint,
    setChainId,
    clearWalletCreationHeight,
    clearCompactFrontierBlockHeight,
  } = useStoreShallow(useSaveGrpcEndpointSelector);

  const [originalChainId, setOriginalChainId] = useState<string | undefined>();
  const [grpcEndpointInput, setGrpcEndpointInput] = useState<string>('');
  const [rpcError, setRpcError] = useState<string>();
  const [isSubmitButtonEnabled, setIsSubmitButtonEnabled] = useState(false);
  const [isValidationLoading, setIsValidationLoading] = useState(false);
  const [confirmChangedChainIdPromise, setConfirmChangedChainIdPromise] = useState<
    PromiseWithResolvers<void> | undefined
  >();

  const isCustomGrpcEndpoint =
    grpcEndpointInput !== '' &&
    !grpcEndpointsQuery.rpcs.some(({ url }) => url === grpcEndpointInput);

  const setGrpcEndpointInputOnLoadFromState = useCallback(() => {
    if (grpcEndpoint) {
      setGrpcEndpointInput(grpcEndpoint);
    }
  }, [grpcEndpoint]);

  useEffect(setGrpcEndpointInputOnLoadFromState, [setGrpcEndpointInputOnLoadFromState]);

  const handleChangeGrpcEndpointInput = useMemo(() => {
    return debounce(async (grpcEndpointInput: string) => {
      setIsSubmitButtonEnabled(false);
      setRpcError(undefined);

      if (!isValidUrl(grpcEndpointInput)) {
        return;
      }

      try {
        setIsValidationLoading(true);
        const trialClient = createClient(
          AppService,
          createGrpcWebTransport({ baseUrl: grpcEndpointInput }),
        );
        const { appParameters } = await trialClient.appParameters({});
        if (!appParameters?.chainId) {
          throw new ConnectError('', Code.NotFound);
        }

        setIsSubmitButtonEnabled(true);
        setChainId(appParameters.chainId);

        // Only set the original chain ID the first time, so that we can compare
        // it on submit.
        setOriginalChainId(originalChainId =>
          originalChainId ? originalChainId : appParameters.chainId,
        );
      } catch (e) {
        if (e instanceof ConnectError && e.code === Code.NotFound) {
          setRpcError(
            'Could not get a chain ID from this endpoint. Please double-check your endpoint URL and try again.',
          );
        } else if (e instanceof ConnectError && e.code === Code.Unknown) {
          setRpcError(
            'Could not connect to endpoint. Please double-check your endpoint URL and try again.',
          );
        } else {
          setRpcError('Could not connect to endpoint: ' + String(e));
        }
      } finally {
        setIsValidationLoading(false);
      }
    }, 400);
  }, []);

  useEffect(
    () => void handleChangeGrpcEndpointInput(grpcEndpointInput),
    [handleChangeGrpcEndpointInput, grpcEndpointInput],
  );

  const chainIdChanged = !!originalChainId && !!chainId && originalChainId !== chainId;

  const onSubmit = async ({
    beforeSubmit,
    onSuccess,
  }: {
    /** Callback to run prior to saving action */
    beforeSubmit?: (proposedEndpoint: string) => void | Promise<void>;
    /** Callback to run when the RPC endpoint successfully saves */
    onSuccess: () => void | Promise<void>;
  }) => {
    setIsSubmitButtonEnabled(false);

    if (beforeSubmit) {
      await beforeSubmit(grpcEndpointInput);
    }

    // If the chain id has changed, our cache is invalid
    if (!isOnboarding && chainIdChanged) {
      const promiseWithResolvers = Promise.withResolvers<void>();
      setConfirmChangedChainIdPromise(promiseWithResolvers);

      try {
        await promiseWithResolvers.promise;
      } catch {
        setIsSubmitButtonEnabled(true);
        return;
      } finally {
        setConfirmChangedChainIdPromise(undefined);
      }

      // changing chain id means the wallet birthday and frontier are no longer valid
      await clearWalletCreationHeight();
      await clearCompactFrontierBlockHeight();

      await setGrpcEndpoint(grpcEndpointInput);
      void chrome.runtime.sendMessage(ServicesMessage.ClearCache);
    } else {
      await setGrpcEndpoint(grpcEndpointInput);
    }

    await onSuccess();
    setIsSubmitButtonEnabled(true);
    setOriginalChainId(chainId);
  };

  return {
    chainId,
    originalChainId,
    /**
     * gRPC endpoints report which chain they represent via the `chainId`
     * property returned by their `appParameters` RPC method. All endpoints for
     * a given chain will have the same chain ID. If the chain ID changes when a
     * user selects a different gRPC endpoint, that means that the new gRPC
     * endpoint represents an entirely different chain than the user was
     * previously using. This is significant, and should be surfaced to the
     * user.
     */
    chainIdChanged,
    confirmChangedChainIdPromise,
    /**
     * The gRPC endpoint entered into the text field, which may or may not be
     * the same as the one saved in local storage.
     */
    grpcEndpointInput,
    setGrpcEndpointInput,
    grpcEndpointsQuery,
    rpcError,
    onSubmit,
    isSubmitButtonEnabled,
    isCustomGrpcEndpoint,
    isValidationLoading,
  };
};
