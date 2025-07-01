import { ExtensionStorage } from './base';
import { KeyJson } from './encryption/key';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- storage schema should be `type` and not `interface`
export type SessionStorageState = { passwordKey?: KeyJson };

// Meant to be used for short-term persisted data. Holds data in memory for the duration of a browser session.
export const sessionExtStorage = new ExtensionStorage<SessionStorageState, undefined>(
  chrome.storage.session,
  {}, // no defaults
  undefined,
);

export type SessionStorage = ExtensionStorage<SessionStorageState, undefined>;
