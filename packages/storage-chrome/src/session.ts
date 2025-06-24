import { ExtensionStorage } from './base';
import { KeyJson } from '@penumbra-zone/crypto-web/encryption';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- storage schema should be `type` and not `interface`
export type SessionStorageState = { passwordKey?: KeyJson };

// Meant to be used for short-term persisted data. Holds data in memory for the duration of a browser session.
export const sessionExtStorage = new ExtensionStorage<SessionStorageState>(chrome.storage.session, {
  /* no defaults */
});
