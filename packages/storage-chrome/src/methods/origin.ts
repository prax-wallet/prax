import { produce } from 'immer';
import { PraxStorage } from '../versions/prax-storage';
import { ChromeStorageArea } from '../util/chrome-storage-area';

export const getOriginRecord = async (
  { local }: { local: ChromeStorageArea<PraxStorage<1>['local']> },
  senderOrigin?: string,
) => {
  if (!senderOrigin) {
    return undefined;
  }
  const { knownSites } = await local.get('knownSites');

  const matchRecords = knownSites.filter(r => r.origin === senderOrigin);
  if (matchRecords.length > 1) {
    throw new Error(`There are multiple records for origin: ${senderOrigin}`);
  }

  return matchRecords[0];
};

export const upsertOriginRecord = async (
  { local }: { local: ChromeStorageArea<PraxStorage<1>['local']> },
  proposal: { origin: string; choice: 'Approved' | 'Denied' | 'Ignored'; date: number },
) => {
  const { knownSites } = await local.get('knownSites');

  const newKnownSites = produce(knownSites, allRecords => {
    const match = allRecords.find(r => r.origin === proposal.origin);
    if (!match) {
      allRecords.push(proposal);
    } else {
      // already matched
      // match.origin = proposal.origin;
      match.choice = proposal.choice;
      match.date = proposal.date;
    }
  });

  await local.set({ knownSites: newKnownSites });
};

export const removeOriginRecord = async (
  { local }: { local: ChromeStorageArea<PraxStorage<1>['local']> },
  removeOrigin: string,
): Promise<void> => {
  const { knownSites } = await local.get('knownSites');

  const newKnownSites = produce(knownSites, allRecords => {
    const matchIndex = allRecords.findIndex(r => r.origin === removeOrigin);
    if (matchIndex !== -1) {
      allRecords.splice(matchIndex, 1);
    }
  });

  await local.set({ knownSites: newKnownSites });
};
