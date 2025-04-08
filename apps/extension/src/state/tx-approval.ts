import { AllSlices, SliceCreator } from '.';
import {
  TransactionPlan,
  TransactionView,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { viewClient } from '../clients';
import type { Jsonified, Stringified } from '@penumbra-zone/types/jsonified';
import { classifyTransaction } from '@penumbra-zone/perspective/transaction/classify';
import { TransactionClassification } from '@penumbra-zone/perspective/transaction/classification';

import {
  asPublicTransactionView,
  asReceiverTransactionView,
} from '@penumbra-zone/perspective/translators/transaction-view';
import { AssetId, Metadata } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { viewTransactionPlan } from '@penumbra-zone/perspective/plan/view-transaction-plan';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import type { ExtensionStorage } from '../storage/base';
import type { LocalStorageState, UserChoice } from '../storage/types';
import { PopupRequest, PopupResponse, PopupType } from '../message/popup';
import { deserializeWallet } from '../wallet';

export interface TxApprovalSlice {
  /**
   * Zustand doesn't like JsonValue, because the type is infinitely deep. And we
   * can't store instances of custom classes (like `TransactionView`s) in the
   * store, because we're using Immer middleware for Zustand, which requires
   * that everything be JSON-serializeable. So we'll store `Stringified`
   * representations of them instead.
   */
  responder?: PromiseWithResolvers<PopupResponse<PopupType.TxApproval>[PopupType.TxApproval]>;
  txPlan?: Stringified<TransactionPlan>;
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
  (set, get) => {
    const getFvk = async () => {
      const [wallet0] = await local.get('wallets');
      if (!wallet0) {
        throw new Error('No wallet');
      }

      const { fullViewingKey } = deserializeWallet(wallet0);
      return new FullViewingKey(fullViewingKey);
    };

    return {
      acceptRequest: async ({ txPlan: txPlanJson }) => {
        const { txApproval: existing } = get();

        if (existing.responder) {
          throw new Error('Another request is still pending');
        }
        const responder =
          Promise.withResolvers<PopupResponse<PopupType.TxApproval>[PopupType.TxApproval]>();
        set(state => {
          state.txApproval.responder = responder;
        });

        const txPlan = TransactionPlan.fromJson(txPlanJson);

        const getMetadata = async (assetId: AssetId) => {
          try {
            const { denomMetadata } = await viewClient.assetMetadataById({ assetId });
            return denomMetadata ?? new Metadata({ penumbraAssetId: assetId });
          } catch {
            return new Metadata({ penumbraAssetId: assetId });
          }
        };

        const transactionView = await viewTransactionPlan(txPlan, getMetadata, await getFvk());

        // pregenerate views from various perspectives.
        // TODO: should this be done in the component?
        const asSender = transactionView;
        const asPublic = asPublicTransactionView(transactionView);
        const asReceiver = await asReceiverTransactionView(transactionView, {
          // asRecieverTransactionView will need to ask viewClient about address provenace
          isControlledAddress: address =>
            viewClient
              .indexByAddress({ address })
              .then(({ addressIndex }) => Boolean(addressIndex)),
        });
        const transactionClassification = classifyTransaction(transactionView);

        set(state => {
          state.txApproval.txPlan = txPlan.toJsonString();
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
          txPlan: txPlanString,
        } = get().txApproval;

        try {
          if (!responder) {
            throw new Error('No responder');
          }

          try {
            if (choice === undefined || !transactionViewString || !txPlanString) {
              throw new Error('Missing response data');
            }

            // zustand doesn't like jsonvalue so stringify
            const txPlan = TransactionPlan.fromJsonString(
              txPlanString,
            ).toJson() as Jsonified<TransactionPlan>;

            responder.resolve({
              choice,
              txPlan,
            });
          } catch (e) {
            responder.reject(e);
          }
        } finally {
          set(state => {
            state.txApproval.responder = undefined;
            state.txApproval.txPlan = undefined;
            state.txApproval.transactionView = undefined;
            state.txApproval.choice = undefined;

            state.txApproval.asSender = undefined;
            state.txApproval.asReceiver = undefined;
            state.txApproval.asPublic = undefined;
            state.txApproval.transactionClassification = undefined;
          });
        }
      },
    };
  };

export const txApprovalSelector = (state: AllSlices) => state.txApproval;
