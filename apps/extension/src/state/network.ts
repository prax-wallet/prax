import { LocalStorageState } from '../storage/types';
import { ExtensionStorage } from '../storage/base';
import { AllSlices, SliceCreator } from '.';

export interface NetworkSlice {
  grpcEndpoint: string | undefined;
  fullSyncHeight?: number;
  chainId?: string;
  setGRPCEndpoint: (endpoint: string) => Promise<void>;
  clearWalletCreationHeight: () => Promise<void>;
  setChainId: (chainId: string) => void;
}

export const createNetworkSlice =
  (local: ExtensionStorage<LocalStorageState>): SliceCreator<NetworkSlice> =>
  set => {
    const getWallets = () => local.get('wallets');
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
        const wallets = await getWallets();
        await local.set(
          'wallets',
          wallets.map(w => ({ ...w, creationHeight: undefined })),
        );
      },
      setChainId: (chainId: string) => {
        set(state => {
          state.network.chainId = chainId;
        });
      },
    };
  };

export const networkSelector = (state: AllSlices) => state.network;
