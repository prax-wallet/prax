import { localExtStorage } from './local';
import { OriginRecord } from './types';

export const getOriginRecord = async (getOrigin?: string) => {
  if (!getOrigin) {
    return undefined;
  }
  const knownSites = await localExtStorage.get('knownSites');

  const [match, ...extra] = knownSites.filter(r => r.origin === getOrigin);
  if (extra.length !== 0) {
    throw new Error(`There are multiple records for origin: ${getOrigin}`);
  }

  return match;
};

export const upsertOriginRecord = async (proposal: OriginRecord) => {
  const knownSites = await localExtStorage.get('knownSites');

  const newKnownSites = [...knownSites.filter(r => r.origin !== proposal.origin), proposal];

  await localExtStorage.set('knownSites', newKnownSites);
};

export const removeOriginRecord = async (removeOrigin: string): Promise<void> => {
  const knownSites = await localExtStorage.get('knownSites');

  const newKnownSites = knownSites.filter(r => r.origin !== removeOrigin);

  await localExtStorage.set('knownSites', newKnownSites);
};
