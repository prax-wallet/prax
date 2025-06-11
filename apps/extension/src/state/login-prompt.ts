import type { AllSlices, SliceCreator } from '.';
import type { PopupRequest, PopupResponse, PopupType } from '../message/popup';

export interface LoginPromptSlice {
  responder?: PromiseWithResolvers<PopupResponse<PopupType.LoginPrompt>[PopupType.LoginPrompt]>;
  next?: Exclude<PopupType, PopupType.LoginPrompt>;
  sender?: chrome.runtime.MessageSender;
  didLogin?: boolean;

  acceptRequest: (
    req: PopupRequest<PopupType.LoginPrompt>[PopupType.LoginPrompt],
    sender?: chrome.runtime.MessageSender,
  ) => Promise<PopupResponse<PopupType.LoginPrompt>[PopupType.LoginPrompt]>;

  setDidLogin: (didLogin: boolean) => void;

  sendResponse: () => void;
}

export const createLoginPromptSlice = (): SliceCreator<LoginPromptSlice> => (set, get) => {
  const cleanup = () => {
    set(state => {
      state.loginPrompt.responder = undefined;
      state.loginPrompt.sender = undefined;
      state.loginPrompt.next = undefined;
      state.loginPrompt.didLogin = undefined;
    });
  };

  return {
    acceptRequest: ({ next }, sender) => {
      const existing = get().loginPrompt;
      if (existing.responder) {
        throw new Error('Another request is still pending');
      }
      if (!sender) {
        throw new ReferenceError('No sender');
      }

      const responder =
        Promise.withResolvers<PopupResponse<PopupType.LoginPrompt>[PopupType.LoginPrompt]>();

      set(state => {
        state.loginPrompt.responder = responder;
        state.loginPrompt.sender = sender;
        state.loginPrompt.next = next;
      });

      return responder.promise.finally(cleanup);
    },

    setDidLogin: didLogin => {
      set(state => {
        state.loginPrompt.didLogin = didLogin;
      });
    },

    sendResponse: () => {
      const { responder, next, sender, didLogin } = get().loginPrompt;

      if (!responder) {
        cleanup();
        throw new ReferenceError('No responder');
      }

      try {
        if (!sender || !next || didLogin == null) {
          throw new ReferenceError('Missing request data');
        }

        responder.resolve({ didLogin });
      } catch (e) {
        responder.reject(e);
      }
    },
  };
};

export const loginPromptSelector = (state: AllSlices) => state.loginPrompt;
