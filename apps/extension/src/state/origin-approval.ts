import { UserChoice } from '@penumbra-zone/types/user-choice';
import { AllSlices, SliceCreator } from '.';
import { PopupRequest, PopupResponse, PopupType } from '../message/popup';

export interface OriginApprovalSlice {
  responder?: PromiseWithResolvers<
    PopupResponse<PopupType.OriginApproval>[PopupType.OriginApproval]
  >;
  sender?: chrome.runtime.MessageSender;
  choice?: UserChoice;
  lastRequest?: Date;

  acceptRequest: (
    req: PopupRequest<PopupType.OriginApproval>[PopupType.OriginApproval],
    sender?: chrome.runtime.MessageSender,
  ) => Promise<PopupResponse<PopupType.OriginApproval>[PopupType.OriginApproval]>;

  setChoice: (attitute: UserChoice) => void;

  sendResponse: () => void;
}

export const createOriginApprovalSlice = (): SliceCreator<OriginApprovalSlice> => (set, get) => {
  const cleanup = () => {
    set(state => {
      state.originApproval.sender = undefined;
      state.originApproval.responder = undefined;
      state.originApproval.choice = undefined;
    });
  };

  return {
    setChoice: (choice: UserChoice) => {
      set(state => {
        state.originApproval.choice = choice;
      });
    },

    acceptRequest: ({ lastRequest }, sender) => {
      const existing = get().originApproval;
      if (existing.responder) {
        throw new Error('Another request is still pending');
      }

      if (!sender) {
        throw new ReferenceError('No sender');
      }

      // set responder synchronously
      const responder =
        Promise.withResolvers<PopupResponse<PopupType.OriginApproval>[PopupType.OriginApproval]>();
      set(state => {
        state.originApproval.responder = responder;
        state.originApproval.sender = sender;
        state.originApproval.lastRequest = lastRequest ? new Date(lastRequest) : undefined;
      });

      return responder.promise.finally(cleanup);
    },

    sendResponse: () => {
      const { responder, choice, sender } = get().originApproval;

      if (!responder) {
        cleanup();
        throw new ReferenceError('No responder');
      }

      try {
        if (choice === undefined || !sender?.origin) {
          throw new ReferenceError('Missing response data');
        }

        responder.resolve({
          choice,
          origin: sender.origin,
          date: Date.now(),
        });
      } catch (e) {
        responder.reject(e);
      }
    },
  };
};

export const originApprovalSelector = (state: AllSlices) => state.originApproval;
