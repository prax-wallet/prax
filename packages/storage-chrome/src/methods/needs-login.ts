import { ConnectError, Code } from '@connectrpc/connect';
import { PraxStorage } from '../versions/prax-storage';
import { ChromeStorageArea } from '../util/chrome-storage-area';

/** Throws if the user is not logged in. */
export const throwIfNeedsLogin = async ({
  session,
}: {
  session: ChromeStorageArea<PraxStorage<1>['session']>;
}) => {
  const { passwordKey } = await session.get('passwordKey');
  if (!passwordKey) {
    throw new ConnectError('User must login to extension', Code.Unauthenticated);
  }
};
