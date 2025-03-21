import { viewTransactionPlan } from '@penumbra-zone/perspective/plan/view-transaction-plan';
import { classifyTransaction } from '@penumbra-zone/perspective/transaction/classify';
import {
  asPublicTransactionView,
  asReceiverTransactionView,
} from '@penumbra-zone/perspective/translators/transaction-view';
import { AssetId, Metadata } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { Address, FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import {
  TransactionPlan,
  TransactionView,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { AllSlices, SliceCreator } from '.';
import { viewClient } from '../clients';
import { PopupRequest, PopupResponse, PopupType } from '../message/popup';
import type { ExtensionStorage } from '../storage/base';
import type { LocalStorageState } from '../storage/types';
import { PlainMessage, toPlainMessage } from '@bufbuild/protobuf';
import { Jsonified } from '@penumbra-zone/types/jsonified';
import { TransactionClassification } from '@penumbra-zone/perspective/transaction/classification';

export interface TxApprovalSlice {
  responder?: PromiseWithResolvers<PopupResponse<PopupType.TxApproval>[PopupType.TxApproval]>;
  request?: { authorizeRequest: PlainMessage<AuthorizeRequest> };
  response?: { choice: UserChoice; authorizeRequest: PlainMessage<AuthorizeRequest> };

  views?: {
    asSender: PlainMessage<TransactionView>;
    asPublic: PlainMessage<TransactionView>;
    asReceiver: PlainMessage<TransactionView>;
    transactionClassification: TransactionClassification;
  };

  acceptRequest: <T extends PopupType.TxApproval>(
    req: PopupRequest<T>[T],
  ) => Promise<PopupResponse<T>[T]>;

  setChoice: (choice: UserChoice) => void;

  sendResponse: () => void;
}

export const createTxApprovalSlice =
  (local: ExtensionStorage<LocalStorageState>): SliceCreator<TxApprovalSlice> =>
  (set, get) => ({
    acceptRequest: async request => {
      const existing = get().txApproval;
      if (existing.responder || existing.request || existing.response || existing.views) {
        throw new Error('Another transaction approval is still pending');
      }
      const responder =
        Promise.withResolvers<PopupResponse<PopupType.TxApproval>[PopupType.TxApproval]>();

      const authorizeRequest = AuthorizeRequest.fromJson(request.authorizeRequest);

      set(state => {
        state.txApproval.request = { authorizeRequest: toPlainMessage(authorizeRequest) };
        state.txApproval.responder = responder;
        state.txApproval.response = undefined;
        state.txApproval.views = undefined;
      });

      void local.get('wallets').then(async ([wallet]) => {
        if (!wallet) {
          throw new ReferenceError('No wallet found');
        }
        const fvk = FullViewingKey.fromJsonString(wallet.fullViewingKey);
        const views = await initViews(fvk, authorizeRequest);
        set(state => {
          state.txApproval.views = views;
        });
      });

      return responder.promise;
    },

    setChoice: choice => {
      set(state => {
        const request = state.txApproval.request;
        if (!request) {
          throw new ReferenceError('No transaction approval is pending');
        }

        state.txApproval.response = {
          choice,
          authorizeRequest: request.authorizeRequest,
        };
      });
    },

    sendResponse: () => {
      const { request, responder, response } = get().txApproval;

      try {
        if (!responder || !request) {
          throw new Error('No transaction approval is pending');
        }

        if (!response) {
          throw new ReferenceError('Missing transaction approval response');
        }

        try {
          responder.resolve({
            choice: response.choice,
            authorizeRequest: new AuthorizeRequest(
              response.authorizeRequest,
            ).toJson() as Jsonified<AuthorizeRequest>,
          });
        } catch (e) {
          responder.reject(e);
        }
      } finally {
        set(state => {
          state.txApproval.responder = undefined;
          state.txApproval.request = undefined;
          state.txApproval.response = undefined;
          state.txApproval.views = undefined;
        });
      }
    },
  });

export const txApprovalSelector = (state: AllSlices) => {
  const {
    sendResponse,
    setChoice,
    request: { authorizeRequest: plainAuthorizeRequest } = {},
    views: plainViews,
  } = state.txApproval;

  const views = plainViews && {
    asSender: new TransactionView(plainViews.asSender),
    asPublic: new TransactionView(plainViews.asPublic),
    asReceiver: new TransactionView(plainViews.asReceiver),
    transactionClassification: plainViews.transactionClassification,
  };

  const authorizeRequest = plainAuthorizeRequest && new AuthorizeRequest(plainAuthorizeRequest);

  return {
    ...views,
    authorizeRequest,
    sendResponse,
    setChoice,
  };
};

const initViews = async (
  fvk: FullViewingKey,
  authorizeRequest: AuthorizeRequest,
): Promise<NonNullable<TxApprovalSlice['views']>> => {
  const getMetadata = async (assetId: AssetId) => {
    try {
      const { denomMetadata } = await viewClient.assetMetadataById({ assetId });
      return denomMetadata ?? new Metadata({ penumbraAssetId: assetId });
    } catch {
      return new Metadata({ penumbraAssetId: assetId });
    }
  };

  const isControlledAddress = (address: Address) =>
    viewClient.indexByAddress({ address }).then(({ addressIndex }) => Boolean(addressIndex));

  const transactionView = await viewTransactionPlan(
    new TransactionPlan(authorizeRequest.plan),
    getMetadata,
    fvk,
  );

  const asSender = transactionView;
  const asPublic = asPublicTransactionView(transactionView);
  const asReceiver = await asReceiverTransactionView(transactionView, {
    isControlledAddress,
  });
  const transactionClassification = classifyTransaction(transactionView).type;

  return {
    asSender: toPlainMessage(asSender),
    asPublic: toPlainMessage(asPublic),
    asReceiver: toPlainMessage(asReceiver),
    transactionClassification,
  };
};
