import { ConnectError, Code } from '@connectrpc/connect';
import { sessionExtStorage } from '@repo/storage-chrome/session';

/** Throws if the user is not logged in. */
export const throwIfNeedsLogin = async () => {
  const loggedIn = await sessionExtStorage.get('passwordKey');
  if (!loggedIn) {
    throw new ConnectError('User must login to extension', Code.Unauthenticated);
  }
};
