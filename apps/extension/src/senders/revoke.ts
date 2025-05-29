import { CRSessionManager } from '@penumbra-zone/transport-chrome/session-manager';
import { removeOriginRecord } from '@repo/storage-chrome/origin';
import { PraxControl } from '../content-scripts/message/prax-control';
import { sendTabs } from '../message/send/tab';

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

  void Promise.all(
    // The sessions are already dead. But they'll assume disconnect is just chrome
    // flakiness, and try to wake up for new requests. The killed sessions should
    // fail to reconnect, but they will keep trying.
    //
    // This informs the content scripts they are actually disconnected, so they
    // can clean up.
    sendTabs(killedSenders, PraxControl.End),
  ).catch(failure => {
    // This should never happen, but if it does, hopefully restarting the
    // extension will stop anything weird happening.
    console.error("Couldn't end all sessions for origin", targetOrigin, failure);
    console.warn('Restarting extension to invalidate context.');
    void storageOperation.finally(() => chrome.runtime.reload());
  });
};
