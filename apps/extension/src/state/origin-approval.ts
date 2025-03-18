import { ConnectError } from '@connectrpc/connect';
import { DialogRequest, DialogResponse } from '../message/internal-control/dialog';
import { AllSlices, SliceCreator } from '.';
import { errorToJson } from '@connectrpc/connect/protocol-connect';
import type { ControlFailure, ControlRequest, ControlResponse } from '../message/control';
import { UserChoice } from '@penumbra-zone/types/user-choice';

export interface OriginApprovalSlice {
  responder?: (
    m: ControlResponse<'Dialog', DialogResponse<'ApproveOrigin'>> | ControlFailure,
  ) => void;
  favIconUrl?: string;
  title?: string;
  requestOrigin?: string;
  choice?: UserChoice;
  lastRequest?: Date;

  acceptRequest: (
    req: ControlRequest<'Dialog', DialogRequest<'ApproveOrigin'>>,
    responder: (
      m: ControlResponse<'Dialog', DialogResponse<'ApproveOrigin'>> | ControlFailure,
    ) => void,
  ) => void;

  setChoice: (attitude: UserChoice) => void;

  sendResponse: () => void;
}

export const createOriginApprovalSlice = (): SliceCreator<OriginApprovalSlice> => (set, get) => ({
  setChoice: (choice: UserChoice) => {
    set(state => {
      state.originApproval.choice = choice;
    });
  },

  acceptRequest: (
    {
      Dialog: {
        ApproveOrigin: { origin: requestOrigin, favIconUrl, title, lastRequest },
      },
    }: ControlRequest<'Dialog', DialogRequest<'ApproveOrigin'>>,
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
    const { responder, choice, requestOrigin } = get().originApproval;

    if (!responder) {
      throw new Error('No responder');
    }

    try {
      if (choice === undefined || !requestOrigin) {
        throw new Error('Missing response data');
      }
      responder({
        Dialog: {
          ApproveOrigin: choice,
        },
      });
    } catch (e) {
      responder({
        error: errorToJson(ConnectError.from(e), undefined),
      });
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
