import { LocalStorageState } from '../storage/types';
import { ExtensionStorage } from '../storage/base';
import { AllSlices, SliceCreator } from '.';

export interface NetworkSlice {
  grpcEndpoint: string | undefined;
  fullSyncHeight?: number;
  chainId?: string;
  setGRPCEndpoint: (endpoint: string) => Promise<void>;
  setChainId: (chainId: string) => void;
  setFullSyncHeight: (value?: number) => Promise<void>;
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
      setChainId: (chainId: string) => {
        set(state => {
          state.network.chainId = chainId;
        });
      },
      setFullSyncHeight: async value => {
        set(state => {
          state.network.fullSyncHeight = value;
        });

        await local.set('fullSyncHeight', value);
      },
    };
  };

export const networkSelector = (state: AllSlices) => state.network;
