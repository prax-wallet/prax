import { produce } from 'immer';
import { localExtStorage } from './defaults';
import { OriginRecord } from './versions/v1';

export const getOriginRecord = async (senderOrigin?: string) => {
  if (!senderOrigin) {
    return undefined;
  }
  const knownSites = await localExtStorage.get('knownSites');

  const matchRecords = knownSites.filter(r => r.origin === senderOrigin);
  if (matchRecords.length > 1) {
    throw new Error(`There are multiple records for origin: ${senderOrigin}`);
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
