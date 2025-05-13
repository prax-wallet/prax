import { produce } from 'immer';
import { localExtStorage } from './local';
import { OriginRecord } from './types';

export const getOriginRecord = async (getOrigin?: string) => {
  if (!getOrigin) {
    return undefined;
  }
  const knownSites = await localExtStorage.get('knownSites');

  const matchRecords = knownSites.filter(r => r.origin === getOrigin);
  if (matchRecords.length > 1) {
    throw new Error(`There are multiple records for origin: ${getOrigin}`);
  }

  return matchRecords[0];
};

export const upsertOriginRecord = async (proposal: OriginRecord) => {
  const knownSites = await localExtStorage.get('knownSites');

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

  await localExtStorage.set('knownSites', newKnownSites);
};

export const removeOriginRecord = async (removeOrigin: string): Promise<void> => {
  const knownSites = await localExtStorage.get('knownSites');

  const newKnownSites = produce(knownSites, allRecords => {
    const matchIndex = allRecords.findIndex(r => r.origin === removeOrigin);
    if (matchIndex !== -1) {
      allRecords.splice(matchIndex, 1);
    }
  });

  await localExtStorage.set('knownSites', newKnownSites);
};
