import { PopupLoaderData } from '../routes/popup/home';
import { useLoaderData } from 'react-router-dom';
import { useLatestBlockHeight } from './latest-block-height';
import { useStore } from '../state';
import { networkSelector } from '../state/network';

const tryGetMax = (a?: number, b?: number): number | undefined => {
  // Height can be 0n which is falsy, so should compare to undefined state
  if (a === undefined) {
    return b;
  }
  if (b === undefined) {
    return a;
  }

  return Math.max(a, b);
};

// There is a slight delay with Zustand loading up the last block synced.
// To prevent the screen flicker, we use a loader to read it from chrome.storage.local.
const useFullSyncHeight = (): number | undefined => {
  const { fullSyncHeight: localHeight } = useLoaderData() as PopupLoaderData;
  const { fullSyncHeight: memoryHeight } = useStore(networkSelector);

  return tryGetMax(localHeight, memoryHeight);
};

export const useSyncProgress = () => {
  const fullSyncHeight = useFullSyncHeight();
  const { data: queriedLatest, error } = useLatestBlockHeight();

  // If we have a queried sync height and it's ahead of our block-height query,
  // use the sync value instead
  const latestBlockHeight = queriedLatest ? tryGetMax(queriedLatest, fullSyncHeight) : undefined;

  return { latestBlockHeight, fullSyncHeight, error };
};
