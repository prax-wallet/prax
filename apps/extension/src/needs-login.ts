import { ConnectError, Code } from '@connectrpc/connect';
import { sessionExtStorage } from '@repo/storage-chrome/session';
import { popup } from './popup';
import { PopupType } from './message/popup';

/** Throws if the user is not logged in. */
export const throwIfNeedsLogin = async () => {
  const loggedIn = await sessionExtStorage.get('passwordKey');
  if (!loggedIn) {
    throw new ConnectError('User must login to extension', Code.Unauthenticated);
  }
};

/** Prompts the user to login if they are not logged in. */
export const promptIfNeedsLogin = async (
  next: Exclude<PopupType, PopupType.LoginPrompt>,
  sender?: chrome.runtime.MessageSender,
) => {
  try {
    const alreadyLoggedIn = (await sessionExtStorage.get('passwordKey')) != null;
    if (alreadyLoggedIn) {
      return;
    }

    if (sender) {
      const attemptLogin = await popup(PopupType.LoginPrompt, { next }, sender);
      if (attemptLogin?.didLogin) {
        return;
      }
    }
  } catch (failure) {
    console.error('Failed to log in', failure);
  }

  throw new ConnectError('User must login to extension', Code.Unauthenticated);
};
