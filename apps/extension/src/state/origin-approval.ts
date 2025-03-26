import { UserChoice } from '@penumbra-zone/types/user-choice';
import { AllSlices, SliceCreator } from '.';
import { PopupRequestData, PopupResponseData } from '../message/popup';

export interface OriginApprovalSlice {
  responder?: PromiseWithResolvers<PopupResponseData<'OriginApproval'>>;
  favIconUrl?: string;
  title?: string;
  requestOrigin?: string;
  choice?: UserChoice;
  lastRequest?: Date;

  acceptRequest: (
    req: PopupRequestData<'OriginApproval'>,
  ) => Promise<PopupResponseData<'OriginApproval'>>;

  setChoice: (attitute: UserChoice) => void;

  sendResponse: () => void;
}

export const createOriginApprovalSlice = (): SliceCreator<OriginApprovalSlice> => (set, get) => ({
  setChoice: (choice: UserChoice) => {
    set(state => {
      state.originApproval.choice = choice;
    });
  },

  acceptRequest: ({ origin: requestOrigin, favIconUrl, title, lastRequest }) => {
    const existing = get().originApproval;
    if (existing.responder) {
      throw new Error('Another request is still pending');
    }

    // set responder synchronously
    const responder = Promise.withResolvers<PopupResponseData<'OriginApproval'>>();
    set(state => {
      state.originApproval.responder = responder;
    });

    set(state => {
      state.originApproval.favIconUrl = favIconUrl;
      state.originApproval.title = title && !title.startsWith(requestOrigin) ? title : undefined;
      state.originApproval.requestOrigin = requestOrigin;
      state.originApproval.lastRequest = lastRequest ? new Date(lastRequest) : undefined;
    });

    return responder.promise;
  },

  sendResponse: () => {
    const { responder, choice, requestOrigin } = get().originApproval;

    try {
      if (!responder) {
        throw new Error('No responder');
      }
      try {
        if (choice === undefined || !requestOrigin) {
          throw new ReferenceError('Missing response data');
        }

        responder.resolve({
          choice,
          origin: requestOrigin,
          date: Date.now(),
        });
      } catch (e) {
        responder.reject(e);
      }
    } finally {
      set(state => {
        state.originApproval.responder = undefined;
        state.originApproval.choice = undefined;
        state.originApproval.requestOrigin = undefined;
        state.originApproval.favIconUrl = undefined;
        state.originApproval.title = undefined;
      });
    }
  },
});

export const originApprovalSelector = (state: AllSlices) => state.originApproval;
