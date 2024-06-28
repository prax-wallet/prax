import { alreadyApprovedSender } from './approve';
import { removeOriginRecord } from '../storage/origin';

/**
 * Remove the approval status of an approved origin, for use by disconnect
 * request handler. Input origins should already be validated.
 *
 * Only approved senders may request removal of their existing approval.
 *
 * @param disconnect A sender that has already been validated
 * @returns void
 */

export const disconnectSender = (disconnect: { origin: string }) =>
  void alreadyApprovedSender(disconnect).then(hasApproval => {
    if (!hasApproval) throw new Error('Sender does not possess approval');
    else void removeOriginRecord(disconnect.origin);
  });
