import { CRSessionManager } from '@penumbra-zone/transport-chrome/session-manager';
import { PraxConnection } from '../message/prax';
import { removeOriginRecord } from '../storage/origin';
import { assertValidSender } from './validate';

/**
 * Request deletion of the origin's permission record, and ask the session
 * manager to immediately kill sessions associated with the origin.
 *
 * The session manager returns a list of senders associated with killed
 * sessions. A `PraxConnection.End` message is sent to the content scripts in
 * those senders.
 */
export const revokeOrigin = (targetOrigin: string) => {
  const storageOperation = removeOriginRecord(targetOrigin);
  const killedSenders = CRSessionManager.killOrigin(targetOrigin);

  /**
   * The sessions are already dead. But they'll assume disconnect is just chrome
   * flakiness, and try to wake up for new requests. The killed sessions should
   * fail to reconnect, but they will keep trying.
   *
   * This informs the content scripts they are actually disconnected, so they
   * can clean up.
   */

  // messages send by tab id
  for (const [_, tabKills] of Map.groupBy(killedSenders, s => s.tab?.id)) {
    // scope to specific document
    for (const [_, docKills] of Map.groupBy(tabKills, s => s.documentId)) {
      // scope to specific frame
      for (const [_, frameKills] of Map.groupBy(docKills, s => s.frameId)) {
        // the frame's sessions killed all at once
        const [target] = frameKills;
        try {
          // sender should be as valid as when it created the session
          const { tab, documentId, frameId } = assertValidSender(target);

          // end it
          void chrome.tabs.sendMessage(tab.id, PraxConnection.End, { documentId, frameId });
        } catch (invalid) {
          /**
           * This should never happen, but if it does, hopefully restarting the
           * extension will stop anything weird happening.
           */
          console.error("Can't end session of invalid sender", target, invalid);
          console.debug('Restarting extension to invalidate context.');
          void storageOperation.finally(() => chrome.runtime.reload());
        }
      }
    }
  }
};
