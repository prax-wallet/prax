import type { AllSlices, SliceCreator } from '.';
import type { PopupRequest, PopupResponse, PopupType } from '../message/popup';

export interface LoginPromptSlice {
  responder?: PromiseWithResolvers<PopupResponse<PopupType.LoginPrompt>[PopupType.LoginPrompt]>;
  sender?: chrome.runtime.MessageSender;
  next?: PopupType;

  acceptRequest: (
    req: PopupRequest<PopupType.LoginPrompt>[PopupType.LoginPrompt],
  ) => Promise<PopupResponse<PopupType.LoginPrompt>[PopupType.LoginPrompt]>;

  sendResponse: () => void;
}

export const createLoginPromptSlice = (): SliceCreator<LoginPromptSlice> => (set, get) => ({
  acceptRequest: ({ sender, next }) => {
    const existing = get().loginPrompt;
    if (existing.responder) {
      throw new Error('Another request is still pending');
    }

    // set responder synchronously
    const responder =
      Promise.withResolvers<PopupResponse<PopupType.LoginPrompt>[PopupType.LoginPrompt]>();
    set(state => {
      state.loginPrompt.responder = responder;
    });

    set(state => {
      state.loginPrompt.sender = sender;
      state.loginPrompt.next = next;
    });

    return responder.promise;
  },

  sendResponse: () => {
    const { responder, sender, next } = get().loginPrompt;

    try {
      if (!responder) {
        throw new Error('No responder');
      }
      try {
        if (!sender || !next) {
          throw new ReferenceError('Missing response data');
        }

        responder.resolve({
          sender,
          next,
        });
      } catch (e) {
        responder.reject(e);
      }
    } finally {
      set(state => {
        state.loginPrompt.responder = undefined;
        state.loginPrompt.sender = undefined;
        state.loginPrompt.next = undefined;
      });
    }
  },
});

export const loginPromptSelector = (state: AllSlices) => state.loginPrompt;
