import type { LocalStorageState } from '@repo/storage-chrome/local';
import type { ExtensionStorage } from '@repo/storage-chrome/base';
import { AllSlices, SliceCreator } from '.';
import { Stringified } from '@penumbra-zone/types/jsonified';
import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';

export interface NumerairesSlice {
  selectedNumeraires: Stringified<AssetId>[];
  selectNumeraire: (numeraire: Stringified<AssetId>) => void;
  saveNumeraires: () => Promise<void>;
}

export const createNumerairesSlice =
  (local: ExtensionStorage<LocalStorageState>): SliceCreator<NumerairesSlice> =>
  (set, get) => {
    return {
      selectedNumeraires: [],
      selectNumeraire: (numeraire: Stringified<AssetId>) => {
        set(state => {
          const index = state.numeraires.selectedNumeraires.indexOf(numeraire);
          if (index > -1) {
            state.numeraires.selectedNumeraires.splice(index, 1);
          } else {
            state.numeraires.selectedNumeraires.push(numeraire);
          }
        });
      },
      saveNumeraires: async () => {
        await local.set('numeraires', get().numeraires.selectedNumeraires);
      },
    };
  };

export const numerairesSelector = (state: AllSlices) => state.numeraires;
