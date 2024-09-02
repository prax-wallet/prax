import { ExtensionStorage } from '../storage/base';
import { LocalStorageState } from '../storage/types';
import { AllSlices, SliceCreator } from '.';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { TendermintProxyService } from '@penumbra-zone/protobuf';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { createPromiseClient } from '@connectrpc/connect';
import { sample } from 'lodash';

export interface freshWalletCreationBlockHeightSlice {
  blockHeight: number;
  setBlockHeight: () => Promise<void>;
}

export interface existingWalletCreationBlockHeightSlice {
  blockHeight: number;
  setBlockHeight: (height: number) => Promise<void>;
}

// Utility function to fetch the block height by randomly querying one of the RPC endpoints
// from the chain registry, using a recursive callback to try another endpoint if the current
// one fails. Additionally, this implements a timeout mechanism at the request level to avoid
// hanging from stalled requests.
const fetchBlockHeightWithFallback = async (endpoints: string[]): Promise<number> => {
  if (endpoints.length === 0) {
    throw new Error('All RPC endpoints failed to fetch the block height.');
  }

  // Randomly select an RPC endpoint from the chain registry
  const randomGrpcEndpoint = sample(endpoints);
  if (!randomGrpcEndpoint) {
    throw new Error('No RPC endpoints found.');
  }

  const walletCreationBlockHeight = await fetchBlockHeight(randomGrpcEndpoint);

  if (walletCreationBlockHeight !== undefined) {
    return walletCreationBlockHeight;
  } else {
    // Remove the current endpoint from the list and retry with remaining endpoints
    const remainingEndpoints = endpoints.filter(endpoint => endpoint !== randomGrpcEndpoint);
    return fetchBlockHeightWithFallback(remainingEndpoints);
  }
};

// Fetch the block height from a specific RPC endpoint with a timeout to prevent hanging requests.
export const fetchBlockHeight = async (grpcEndpoint: string): Promise<number | undefined> => {
  const tendermintClient = createPromiseClient(
    TendermintProxyService,
    createGrpcWebTransport({ baseUrl: grpcEndpoint }),
  );

  // TODO: Add timeout handling for async gRPC request

  const blockHeight = (await tendermintClient.getStatus({}).catch(() => undefined))?.syncInfo
    ?.latestBlockHeight;

  return Number(blockHeight);
};

// Fresh wallets: zustand slice that initializes and stores the block height in both Zustand state and local storage.
export const createFreshWalletCreationBlockHeightSlice =
  (local: ExtensionStorage<LocalStorageState>): SliceCreator<freshWalletCreationBlockHeightSlice> =>
  set => ({
    blockHeight: 0,
    setBlockHeight: async () => {
      const chainRegistryClient = new ChainRegistryClient();
      const { rpcs } = chainRegistryClient.bundled.globals();
      const suggestedEndpoints = rpcs.map(i => i.url);

      const blockHeight = await fetchBlockHeightWithFallback(suggestedEndpoints);
      await local.set('walletCreationBlockHeight', blockHeight);
      set(state => {
        state.freshWalletCreationBlockHeight.blockHeight = blockHeight;
      });
    },
  });

// Existing wallets: zustand slice that initializes and stores the block height in both Zustand state and local storage.
export const createExistingWalletCreationBlockHeightSlice =
  (
    local: ExtensionStorage<LocalStorageState>,
  ): SliceCreator<existingWalletCreationBlockHeightSlice> =>
  set => ({
    blockHeight: 0,
    setBlockHeight: async (blockHeight: number) => {
      await local.set('walletCreationBlockHeight', blockHeight);
      set(state => {
        state.existingWalletCreationBlockHeight.blockHeight = blockHeight;
      });
    },
  });

// Selector to retrieve the block height from the Zustand store for fresh wallets
export const freshWalletBlockHeightSelector = (state: AllSlices) =>
  state.freshWalletCreationBlockHeight.blockHeight;

// Selector to retrieve the block height from the Zustand store for existing wallets
export const existingWalletBlockHeightSelector = (state: AllSlices) =>
  state.existingWalletCreationBlockHeight.blockHeight;
