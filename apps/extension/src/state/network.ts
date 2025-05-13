import { LocalStorageState } from '@repo/storage-chrome/types';
import { ExtensionStorage } from '@repo/storage-chrome/base';
import { AllSlices, SliceCreator } from '.';

export interface NetworkSlice {
  grpcEndpoint: string | undefined;
  fullSyncHeight?: number;
  chainId?: string;
  setGRPCEndpoint: (endpoint: string) => Promise<void>;
  clearWalletCreationHeight: () => Promise<void>;
  clearCompactFrontierBlockHeight: () => Promise<void>;
  setChainId: (chainId: string) => void;
}

export const createNetworkSlice =
  (local: ExtensionStorage<LocalStorageState>): SliceCreator<NetworkSlice> =>
  set => {
    return {
      grpcEndpoint: undefined,
      fullSyncHeight: undefined,
      chainId: undefined,
      setGRPCEndpoint: async (endpoint: string) => {
        set(state => {
          state.network.grpcEndpoint = endpoint;
        });

        await local.set('grpcEndpoint', endpoint);
      },
      clearWalletCreationHeight: async () => {
        await local.remove('walletCreationBlockHeight');
      },
      clearCompactFrontierBlockHeight: async () => {
        await local.remove('compactFrontierBlockHeight');
      },
      setChainId: (chainId: string) => {
        set(state => {
          state.network.chainId = chainId;
        });
      },
    };
  };

export const networkSelector = (state: AllSlices) => state.network;
