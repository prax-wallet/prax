import { localExtStorage } from '../storage/local';
import { OriginApproval, PopupType } from '../message/popup';
import { popup } from '../popup';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { produce } from 'immer';
import { OriginRecord } from '../storage/types';

const getOriginRecord = async (getOrigin?: string) => {
  if (!getOrigin) return undefined;
  const knownSites = await localExtStorage.get('knownSites');
  const existingRecords = knownSites.filter(record => record.origin === getOrigin);
  if (!existingRecords.length) {
    return undefined;
  } else if (existingRecords.length === 1) {
    return existingRecords[0];
  } else {
    // TODO: It's likely that an array is not the best data structure for this in storage. Should revisit later.
    throw new Error(`There are multiple records for origin: ${getOrigin}`);
  }
};

const upsertOriginRecord = async (proposal: OriginRecord) => {
  const knownSites = await localExtStorage.get('knownSites');
  const newKnownSites = produce(knownSites, allRecords => {
    const match = allRecords.find(r => r.origin === proposal.origin);
    if (!match) {
      allRecords.push(proposal);
    } else {
      match.choice = proposal.choice;
      match.date = proposal.date;
    }
  });
  await localExtStorage.set('knownSites', newKnownSites);
};

export const alreadyApprovedOrigin = async (getOrigin: string): Promise<boolean> =>
  getOriginRecord(getOrigin).then(r => r?.choice === UserChoice.Approved);

/**
 * Obtain the approval status of an origin, for use by connection request
 * handler. Input origins should already be validated.
 *
 * @param sender A sender that has already been validated
 * @returns The user's choice about the origin, from storage or fresh off the popup
 */
export const approveOrigin = async (sender: {
  origin: string;
  tab: chrome.tabs.Tab;
}): Promise<UserChoice> => {
  const existingRecord = await getOriginRecord(sender.origin);

  switch (existingRecord?.choice) {
    case UserChoice.Approved:
    case UserChoice.Ignored:
      return existingRecord.choice;

    case UserChoice.Denied:
    case undefined: {
      const popupResponse = await popup<OriginApproval>({
        type: PopupType.OriginApproval,
        request: {
          origin: sender.origin,
          favIconUrl: sender.tab.favIconUrl,
          title: sender.tab.title,
          lastRequest: existingRecord?.date,
        },
      });

      // if user interacted with popup, update record
      if (popupResponse) {
        await upsertOriginRecord(popupResponse);
      }

      // return choice, or default denial
      return popupResponse?.choice ?? UserChoice.Denied;
    }
  }
};
