import { UserChoice } from '@penumbra-zone/types/user-choice';
import { AllSlices, SliceCreator } from '.';
import { PopupRequest, PopupResponse, PopupType } from '../message/popup';

export interface OriginApprovalSlice {
  responder?: PromiseWithResolvers<
    PopupResponse<PopupType.OriginApproval>[PopupType.OriginApproval]
  >;
  request?: PopupRequest<PopupType.OriginApproval>[PopupType.OriginApproval];
  response?: PopupResponse<PopupType.OriginApproval>[PopupType.OriginApproval];

  acceptRequest: <T extends PopupType.OriginApproval>(
    req: PopupRequest<T>[T],
  ) => Promise<PopupResponse<T>[T]>;

  setChoice: (choice: UserChoice) => void;

  sendResponse: () => void;
}

export const createOriginApprovalSlice = (): SliceCreator<OriginApprovalSlice> => (set, get) => ({
  setChoice: (choice: UserChoice) => {
    set(state => {
      const request = state.originApproval.request;
      if (!request) {
        throw new ReferenceError('No origin approval is pending');
      }

      state.originApproval.response = {
        choice,
        origin: request.origin,
        date: Date.now(),
      };
    });
  },

  acceptRequest: request => {
    const existing = get().originApproval;
    if (existing.responder || existing.request || existing.response) {
      throw new Error('Another origin approval is still pending');
    }

    const responder =
      Promise.withResolvers<PopupResponse<PopupType.OriginApproval>[PopupType.OriginApproval]>();

    set(state => {
      state.originApproval.responder = responder;
      state.originApproval.request = request;
      state.originApproval.response = undefined;
    });

    return responder.promise;
  },

  sendResponse: () => {
    const { responder, request, response } = get().originApproval;

    try {
      if (!responder || !request) {
        throw new Error('No origin approval is pending');
      }

      if (!response) {
        throw new ReferenceError('Missing origin approval response');
      }

      try {
        responder.resolve(response);
      } catch (e) {
        responder.reject(e);
      }
    } finally {
      set(state => {
        state.originApproval.responder = undefined;
        state.originApproval.response = undefined;
        state.originApproval.request = undefined;
      });
    }
  },
});

export const originApprovalSelector = (state: AllSlices) => {
  const { request, sendResponse, setChoice } = state.originApproval;

  return {
    ...request,
    sendResponse,
    setChoice,
  };
};
