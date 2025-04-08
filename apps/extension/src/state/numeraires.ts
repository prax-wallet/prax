import { LocalStorageState } from '../storage/types';
import { AllSlices, SliceCreator } from '.';
import { ExtensionStorage } from '../storage/base';
import { Stringified } from '@penumbra-zone/types/jsonified';
import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { bech32mAssetId } from '@penumbra-zone/bech32m/passet';

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
        const selectedNumeraires = get().numeraires.selectedNumeraires;
        await local.set(
          'numeraires',
          selectedNumeraires.map(s => bech32mAssetId(AssetId.fromJsonString(s))),
        );
      },
    };
  };

export const numerairesSelector = (state: AllSlices) => state.numeraires;
