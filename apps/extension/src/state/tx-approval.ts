import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import type { Jsonified, Stringified } from '@penumbra-zone/types/jsonified';
import type { UserChoice } from '@penumbra-zone/types/user-choice';
import type { AllSlices, SliceCreator } from '.';
import type { PopupRequest, PopupResponse, PopupType } from '../message/popup';

export interface TxApprovalSlice {
  /**
   * Zustand doesn't like JsonValue, because the type is infinitely deep. And we
   * can't store instances of custom classes (like `TransactionView`s) in the
   * store, because we're using Immer middleware for Zustand, which requires
   * that everything be JSON-serializeable. So we'll store `Stringified`
   * representations of them instead.
   */
  responder?: PromiseWithResolvers<PopupResponse<PopupType.TxApproval>[PopupType.TxApproval]>;
  sender?: chrome.runtime.MessageSender;
  authorizeRequest?: Stringified<AuthorizeRequest>;
  choice?: UserChoice;

  acceptRequest: (
    req: PopupRequest<PopupType.TxApproval>[PopupType.TxApproval],
    sender?: chrome.runtime.MessageSender,
  ) => Promise<PopupResponse<PopupType.TxApproval>[PopupType.TxApproval]>;

  setChoice: (choice: UserChoice) => void;

  sendResponse: () => void;
}

export const createTxApprovalSlice = (): SliceCreator<TxApprovalSlice> => (set, get) => {
  const cleanup = () => {
    set(state => {
      state.txApproval.responder = undefined;
      state.txApproval.sender = undefined;
      state.txApproval.authorizeRequest = undefined;
      state.txApproval.choice = undefined;
    });
  };

  return {
    acceptRequest: ({ authorizeRequest: authReqJson }, sender) => {
      const existing = get().txApproval;
      if (existing.responder) {
        throw new Error('Another request is still pending');
      }
      if (sender) {
        throw new TypeError('TxApproval should not have a sender until service context is updated');
      }

      const authorizeRequest = AuthorizeRequest.fromJson(authReqJson);

      const responder =
        Promise.withResolvers<PopupResponse<PopupType.TxApproval>[PopupType.TxApproval]>();

      set(state => {
        state.txApproval.responder = responder;
        state.txApproval.sender = sender;
        state.txApproval.authorizeRequest = authorizeRequest.toJsonString();
      });

      return responder.promise.finally(cleanup);
    },

    setChoice: choice => {
      set(state => {
        state.txApproval.choice = choice;
      });
    },

    sendResponse: () => {
      const { responder, choice, authorizeRequest: authorizeRequestString } = get().txApproval;

      if (!responder) {
        cleanup();
        throw new Error('No responder');
      }

      try {
        if (!authorizeRequestString) {
          throw new ReferenceError('Missing request data');
        }

        if (choice == null) {
          throw new ReferenceError('Missing response data');
        }

        // zustand doesn't like jsonvalue so stringify
        const authorizeRequest = AuthorizeRequest.fromJsonString(
          authorizeRequestString,
        ).toJson() as Jsonified<AuthorizeRequest>;

        responder.resolve({
          choice,
          authorizeRequest,
        });
      } catch (e) {
        responder.reject(e);
      }
    },
  };
};

export const txApprovalSelector = (state: AllSlices) => state.txApproval;
