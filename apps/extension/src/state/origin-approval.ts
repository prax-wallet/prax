import { UserChoice } from '@penumbra-zone/types/user-choice';
import { AllSlices, SliceCreator } from '.';
import { DialogRequest, DialogRequestType, DialogResponse } from '../message/popup';

interface PromiseExecutors<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

export interface OriginApprovalSlice {
  responder?: PromiseExecutors<DialogResponse<DialogRequestType.ConnectDapp>>;
  favIconUrl?: string;
  title?: string;
  requestOrigin?: string;
  choice?: UserChoice;
  lastRequest?: Date;

  acceptRequest: (
    req: DialogRequest<DialogRequestType.ConnectDapp>,
    responder: PromiseExecutors<DialogResponse<DialogRequestType.ConnectDapp>>,
  ) => void;

  setChoice: (attitute: UserChoice) => void;

  sendResponse: () => void;
}

export const createOriginApprovalSlice = (): SliceCreator<OriginApprovalSlice> => (set, get) => ({
  setChoice: (choice: UserChoice) => {
    set(state => {
      state.originApproval.choice = choice;
    });
  },

  acceptRequest: (
    { [DialogRequestType.ConnectDapp]: { origin: requestOrigin, favIconUrl, title, lastRequest } },
    responder,
  ) => {
    const existing = get().originApproval;
    if (existing.responder) {
      throw new Error('Another request is still pending');
    }

    set(state => {
      state.originApproval.favIconUrl = favIconUrl;
      state.originApproval.title = title && !title.startsWith(requestOrigin) ? title : undefined;
      state.originApproval.requestOrigin = requestOrigin;
      state.originApproval.lastRequest = lastRequest ? new Date(lastRequest) : undefined;
      state.originApproval.responder = responder;
    });
  },

  sendResponse: () => {
    const { responder, choice } = get().originApproval;

    if (!responder) {
      throw new Error('No responder');
    }

    try {
      if (choice) {
        responder.resolve(choice);
      } else {
        throw new Error('Missing response data');
      }
    } catch (e) {
      responder.reject(e);
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
