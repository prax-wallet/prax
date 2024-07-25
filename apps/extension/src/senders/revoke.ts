import { removeOriginRecord } from '../storage/origin';
import { CRSessionManager } from '@penumbra-zone/transport-chrome/session-manager';

/**
 * Immediately remove any origin record from storage, and immediately kill any
 * active connection to the origin.
 */
export const revokeOrigin = (targetOrigin: string) => {
  void removeOriginRecord(targetOrigin);
  CRSessionManager.killOrigin(targetOrigin);
};
