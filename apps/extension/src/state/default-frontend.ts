import { AllSlices, SliceCreator } from '.';
import type { ExtensionStorage } from '@repo/storage-chrome/base';
import type { LocalStorageState } from '@repo/storage-chrome/local';

export interface DefaultFrontendSlice {
  url?: string;
  setUrl: (url: string) => void;
}

export const createDefaultFrontendSlice =
  (local: ExtensionStorage<LocalStorageState>): SliceCreator<DefaultFrontendSlice> =>
  set => ({
    url: undefined,
    setUrl: url => {
      set(state => {
        state.defaultFrontend.url = url;
      });

      void local.set('frontendUrl', url);
    },
  });

export const getDefaultFrontend = (state: AllSlices) => state.defaultFrontend.url;
