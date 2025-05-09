import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import { AllSlices, SliceCreator } from '.';
import {
  TransactionPlan,
  TransactionView,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { viewClient } from '../clients';
import type { Jsonified, Stringified } from '@penumbra-zone/types/jsonified';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { classifyTransaction } from '@penumbra-zone/perspective/transaction/classify';
import { TransactionClassification } from '@penumbra-zone/perspective/transaction/classification';

import {
  asPublicTransactionView,
  asReceiverTransactionView,
} from '@penumbra-zone/perspective/translators/transaction-view';
import { AssetId, Metadata } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { viewTransactionPlan } from '@penumbra-zone/perspective/plan/view-transaction-plan';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import type { ExtensionStorage } from '@repo/prax-storage/base';
import type { LocalStorageState } from '@repo/prax-storage/types';
import { PopupRequest, PopupResponse, PopupType } from '../message/popup';

export interface TxApprovalSlice {
  /**
   * Zustand doesn't like JsonValue, because the type is infinitely deep. And we
   * can't store instances of custom classes (like `TransactionView`s) in the
   * store, because we're using Immer middleware for Zustand, which requires
   * that everything be JSON-serializeable. So we'll store `Stringified`
   * representations of them instead.
   */
  responder?: PromiseWithResolvers<PopupResponse<PopupType.TxApproval>[PopupType.TxApproval]>;
  authorizeRequest?: Stringified<AuthorizeRequest>;
  transactionView?: Stringified<TransactionView>;
  choice?: UserChoice;

  asSender?: Stringified<TransactionView>;
  asReceiver?: Stringified<TransactionView>;
  asPublic?: Stringified<TransactionView>;
  transactionClassification?: TransactionClassification;

  acceptRequest: (
    req: PopupRequest<PopupType.TxApproval>[PopupType.TxApproval],
  ) => Promise<PopupResponse<PopupType.TxApproval>[PopupType.TxApproval]>;

  setChoice: (choice: UserChoice) => void;

  sendResponse: () => void;
}

export const createTxApprovalSlice =
  (local: ExtensionStorage<LocalStorageState>): SliceCreator<TxApprovalSlice> =>
  (set, get) => ({
    acceptRequest: async ({ authorizeRequest: authReqJson }) => {
      const existing = get().txApproval;
      if (existing.responder) {
        throw new Error('Another request is still pending');
      }
      const responder =
        Promise.withResolvers<PopupResponse<PopupType.TxApproval>[PopupType.TxApproval]>();
      set(state => {
        state.txApproval.responder = responder;
      });

      const authorizeRequest = AuthorizeRequest.fromJson(authReqJson);

      const getMetadata = async (assetId: AssetId) => {
        try {
          const { denomMetadata } = await viewClient.assetMetadataById({ assetId });
          return denomMetadata ?? new Metadata({ penumbraAssetId: assetId });
        } catch {
          return new Metadata({ penumbraAssetId: assetId });
        }
      };

      const wallets = await local.get('wallets');
      if (!wallets[0]) {
        throw new Error('No found wallet');
      }

      const transactionView = await viewTransactionPlan(
        authorizeRequest.plan ?? new TransactionPlan(),
        getMetadata,
        FullViewingKey.fromJsonString(wallets[0].fullViewingKey),
      );

      // pregenerate views from various perspectives.
      // TODO: should this be done in the component?
      const asSender = transactionView;
      const asPublic = asPublicTransactionView(transactionView);
      const asReceiver = await asReceiverTransactionView(transactionView, {
        // asRecieverTransactionView will need to ask viewClient about address provenace
        isControlledAddress: address =>
          viewClient.indexByAddress({ address }).then(({ addressIndex }) => Boolean(addressIndex)),
      });
      const transactionClassification = classifyTransaction(transactionView);

      set(state => {
        state.txApproval.authorizeRequest = authorizeRequest.toJsonString();
        state.txApproval.transactionView = transactionView.toJsonString();

        state.txApproval.asSender = asSender.toJsonString();
        state.txApproval.asPublic = asPublic.toJsonString();
        state.txApproval.asReceiver = asReceiver.toJsonString();
        state.txApproval.transactionClassification = transactionClassification.type;

        state.txApproval.choice = undefined;
      });

      return responder.promise;
    },

    setChoice: choice => {
      set(state => {
        state.txApproval.choice = choice;
      });
    },

    sendResponse: () => {
      const {
        responder,
        choice,
        transactionView: transactionViewString,
        authorizeRequest: authorizeRequestString,
      } = get().txApproval;

      try {
        if (!responder) {
          throw new Error('No responder');
        }

        try {
          if (choice === undefined || !transactionViewString || !authorizeRequestString) {
            throw new Error('Missing response data');
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
      } finally {
        set(state => {
          state.txApproval.responder = undefined;
          state.txApproval.authorizeRequest = undefined;
          state.txApproval.transactionView = undefined;
          state.txApproval.choice = undefined;

          state.txApproval.asSender = undefined;
          state.txApproval.asReceiver = undefined;
          state.txApproval.asPublic = undefined;
          state.txApproval.transactionClassification = undefined;
        });
      }
    },
  });

export const txApprovalSelector = (state: AllSlices) => state.txApproval;
