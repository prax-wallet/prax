import { getOriginRecord, upsertOriginRecord } from '@repo/storage-chrome/origin';
import { UserChoice } from '@repo/storage-chrome/records';
import { PopupType } from '../message/popup';
import { popup } from '../popup';
import { PrerenderingExternalSender, ValidExternalSender } from './external';

/**
 * Obtain approval status from storage, as boolean.
 *
 * @param validSender A sender that has already been validated
 * @returns true if an existing record indicates this sender is approved
 */
export const alreadyApprovedSender = async (
  validSender: ValidExternalSender | PrerenderingExternalSender,
): Promise<boolean> =>
  getOriginRecord(validSender.origin).then(r => r?.choice === UserChoice.Approved);

/**
 * Obtain the approval status of an origin, for use by connection request
 * handler. Input origins should already be validated.
 *
 * @param approve A sender that has already been validated
 * @returns The user's choice about the origin, from storage or fresh off the popup
 */
export const approveSender = async (approve: {
  origin: string;
  tab: chrome.tabs.Tab;
}): Promise<UserChoice> => {
  const existingRecord = await getOriginRecord(approve.origin);

  switch (existingRecord?.choice) {
    case UserChoice.Approved:
    case UserChoice.Ignored:
      return existingRecord.choice;

    case UserChoice.Denied:
    case undefined: {
      const popupResponse = await popup(PopupType.OriginApproval, {
        origin: approve.origin,
        favIconUrl: approve.tab.favIconUrl,
        title: approve.tab.title,
        lastRequest: existingRecord?.date,
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
