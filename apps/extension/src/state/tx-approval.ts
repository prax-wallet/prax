import { viewTransactionPlan } from '@penumbra-zone/perspective/plan/view-transaction-plan';
import { TransactionClassification } from '@penumbra-zone/perspective/transaction/classification';
import { classifyTransaction } from '@penumbra-zone/perspective/transaction/classify';
import {
  asPublicTransactionView,
  asReceiverTransactionView,
} from '@penumbra-zone/perspective/translators/transaction-view';
import { AssetId, Metadata } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import {
  TransactionPlan,
  TransactionView,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import type { Stringified } from '@penumbra-zone/types/jsonified';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { AllSlices, SliceCreator } from '.';
import { viewClient } from '../clients';
import { DialogRequest, DialogRequestType, DialogResponse } from '../message/popup';
import { localExtStorage } from '../storage/local';

interface PromiseExecutors<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

export interface TxApprovalSlice {
  /**
   * Zustand doesn't like JsonValue, because the type is infinitely deep. And we
   * can't store instances of custom classes (like `TransactionView`s) in the
   * store, because we're using Immer middleware for Zustand, which requires
   * that everything be JSON-serializeable. So we'll store `Stringified`
   * representations of them instead.
   */
  responder?: PromiseExecutors<DialogResponse<DialogRequestType.AuthorizeTransaction>>;
  authorizeRequest?: Stringified<AuthorizeRequest>;
  transactionView?: Stringified<TransactionView>;
  choice?: UserChoice;

  asSender?: Stringified<TransactionView>;
  asReceiver?: Stringified<TransactionView>;
  asPublic?: Stringified<TransactionView>;
  transactionClassification?: TransactionClassification;

  acceptRequest: (
    authorizeTransactionRequest: DialogRequest<DialogRequestType.AuthorizeTransaction>,
    responder: PromiseExecutors<DialogResponse<DialogRequestType.AuthorizeTransaction>>,
  ) => Promise<void>;

  setChoice: (choice: UserChoice) => void;

  sendResponse: () => void;
}

export const createTxApprovalSlice = (): SliceCreator<TxApprovalSlice> => (set, get) => ({
  acceptRequest: async ({ [DialogRequestType.AuthorizeTransaction]: request }, responder) => {
    const existing = get().txApproval;
    if (existing.responder) {
      throw new Error('Another request is still pending');
    }

    const authorizeRequest = AuthorizeRequest.fromJson(request);

    const getMetadata = async (assetId: AssetId) => {
      try {
        const { denomMetadata } = await viewClient.assetMetadataById({ assetId });
        return denomMetadata ?? new Metadata({ penumbraAssetId: assetId });
      } catch {
        return new Metadata({ penumbraAssetId: assetId });
      }
    };

    const wallets = await localExtStorage.get('wallets');
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
      state.txApproval.responder = responder;

      state.txApproval.authorizeRequest = authorizeRequest.toJsonString();
      state.txApproval.transactionView = transactionView.toJsonString();

      state.txApproval.asSender = asSender.toJsonString();
      state.txApproval.asPublic = asPublic.toJsonString();
      state.txApproval.asReceiver = asReceiver.toJsonString();
      state.txApproval.transactionClassification = transactionClassification.type;

      state.txApproval.choice = undefined;
    });
  },

  setChoice: choice => {
    set(state => {
      state.txApproval.choice = choice;
    });
  },

  sendResponse: () => {
    const { responder, choice } = get().txApproval;

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

export const txApprovalSelector = ({ txApproval }: AllSlices) => {
  const { asSender, asReceiver, asPublic, authorizeRequest, ...rest } = txApproval;

  return {
    ...rest,

    authorizeRequest: authorizeRequest
      ? AuthorizeRequest.fromJsonString(authorizeRequest)
      : undefined,

    views: {
      asSender: asSender ? TransactionView.fromJsonString(asSender) : undefined,
      asReceiver: asReceiver ? TransactionView.fromJsonString(asReceiver) : undefined,
      asPublic: asPublic ? TransactionView.fromJsonString(asPublic) : undefined,
    },
  };
};
