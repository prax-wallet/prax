import { ExtensionStorage } from '@repo/storage-chrome/base';
import { LocalStorageState } from '@repo/storage-chrome/local';
import { OriginRecord } from '@repo/storage-chrome/records';
import { AllSlices, SliceCreator } from '.';

export interface ConnectedSitesSlice {
  filter?: string;
  setFilter: (search?: string) => void;
  knownSites: OriginRecord[];
  discardKnownSite: (originRecord: OriginRecord) => Promise<void>;
}

export const createConnectedSitesSlice =
  (local: ExtensionStorage<LocalStorageState>): SliceCreator<ConnectedSitesSlice> =>
  (set, get) => ({
    knownSites: [],

    filter: undefined,
    setFilter: (search?: string) => {
      set(state => {
        state.connectedSites.filter = search;
      });
    },

    discardKnownSite: async (siteToDiscard: { origin: string }) => {
      const { knownSites } = get().connectedSites;
      const knownSitesWithoutDiscardedSite = knownSites.filter(
        known => known.origin !== siteToDiscard.origin,
      );
      await local.set('knownSites', knownSitesWithoutDiscardedSite);
      void chrome.runtime.sendMessage({ revoke: siteToDiscard.origin });
    },
  });

export const allSitesFilteredOutSelector = (state: AllSlices) => {
  const filter = state.connectedSites.filter;
  if (!filter) {
    return false;
  }

  return !state.connectedSites.knownSites.some(site => site.origin.includes(filter));
};
