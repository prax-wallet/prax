import { JsonObject, PlainMessage, toPlainMessage } from '@bufbuild/protobuf';
import { Code, ConnectError } from '@connectrpc/connect';
import { viewTransactionPlan } from '@penumbra-zone/perspective/plan/view-transaction-plan';
import { TransactionClassification } from '@penumbra-zone/perspective/transaction/classification';
import { classifyTransaction } from '@penumbra-zone/perspective/transaction/classify';
import {
  asPublicTransactionView,
  asReceiverTransactionView,
} from '@penumbra-zone/perspective/translators/transaction-view';
import { AssetId, Metadata } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { getActiveWallet } from './wallets';
import {
  AuthorizationData,
  TransactionPlan,
  TransactionView,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import {
  AuthorizeRequest,
  AuthorizeResponse,
} from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import { UserChoice } from '@repo/storage-chrome/records';
import type { ExtensionStorage } from '@repo/storage-chrome/base';
import type { SessionStorageState } from '@repo/storage-chrome/session';
import { AllSlices, SliceCreator } from '.';
import { viewClient } from '../clients';
import { PopupRequest, PopupResponse, PopupType } from '../message/popup';
import { assertValidActionPlans } from './tx-validation/assert-valid-plan';
import { Key } from '@repo/encryption/key';
import { LocalStorageState } from '@repo/storage-chrome/local';
import { CustodyTypeName, Wallet } from '@repo/wallet';
import { LedgerError } from '@zondax/ledger-js';

const isLedgerError = (cause: unknown): cause is Error & { returnCode: LedgerError } =>
  cause instanceof Error &&
  'returnCode' in cause &&
  typeof cause.returnCode === 'number' &&
  cause.returnCode in LedgerError;

export interface TxApprovalSlice {
  responder?: PromiseWithResolvers<PopupResponse<PopupType.TxApproval>[PopupType.TxApproval]>;
  authorizeRequest?: PlainMessage<AuthorizeRequest>;

  transactionView?: PlainMessage<TransactionView>;

  ready?: Promise<void> | true | Error;
  auth?: Promise<AuthorizationData> | PlainMessage<AuthorizationData> | Error;
  invalidPlan?: Error;

  choice?: UserChoice;
  custodyType?: CustodyTypeName;

  asSender?: PlainMessage<TransactionView>;
  asReceiver?: PlainMessage<TransactionView>;
  asPublic?: PlainMessage<TransactionView>;
  transactionClassification?: TransactionClassification;

  acceptRequest: (
    req: PopupRequest<PopupType.TxApproval>[PopupType.TxApproval],
  ) => Promise<PopupResponse<PopupType.TxApproval>[PopupType.TxApproval]>;

  generateViews: () => Promise<void>;

  setChoice: (choice: UserChoice) => void;

  checkReady: () => void | Promise<void>;
  beginAuth: () => void | Promise<AuthorizationData>;

  resetReady: () => void;

  sendResponse: () => void;
}

export const createTxApprovalSlice =
  (
    session: ExtensionStorage<SessionStorageState>,
    local: ExtensionStorage<LocalStorageState>,
  ): SliceCreator<TxApprovalSlice> =>
  (set, get) => ({
    acceptRequest: async req => {
      const authorizeRequest = AuthorizeRequest.fromJson(req.authorizeRequest);

      const { responder: existingResponder, generateViews } = get().txApproval;
      if (existingResponder) {
        throw new Error('Another request is still pending');
      }

      const responder =
        Promise.withResolvers<PopupResponse<PopupType.TxApproval>[PopupType.TxApproval]>();

      set(state => {
        state.txApproval.responder = responder;
        state.txApproval.authorizeRequest = toPlainMessage(authorizeRequest);
        state.txApproval.choice = undefined;
      });

      const wallet = await reliableGetWallet(get, local);

      set(state => {
        state.txApproval.custodyType = wallet.custodyType;
      });

      try {
        assertValidActionPlans(authorizeRequest.plan?.actions, wallet.fullViewingKey);
      } catch (invalidPlan) {
        set(state => {
          state.txApproval.invalidPlan = ConnectError.from(invalidPlan, Code.InvalidArgument);
        });
      }

      void generateViews();

      return responder.promise;
    },

    generateViews: async () => {
      const wallet = await reliableGetWallet(get, local);
      const { authorizeRequest } = get().txApproval;
      const plan = new TransactionPlan(authorizeRequest?.plan);

      const transactionView = await viewTransactionPlan(
        plan,
        async (assetId: AssetId) => {
          const { denomMetadata = new Metadata({ penumbraAssetId: assetId }) } = await viewClient
            .assetMetadataById({ assetId })
            .catch(() => ({ denomMetadata: undefined }));
          return denomMetadata;
        },
        wallet.fullViewingKey,
      );

      const asSender = transactionView;
      const asPublic = asPublicTransactionView(transactionView);
      const asReceiver = await asReceiverTransactionView(transactionView, {
        isControlledAddress: address =>
          viewClient.indexByAddress({ address }).then(({ addressIndex }) => Boolean(addressIndex)),
      });

      const transactionClassification = classifyTransaction(transactionView);

      set(state => {
        state.txApproval.transactionView = toPlainMessage(transactionView);

        state.txApproval.asSender = toPlainMessage(asSender);
        state.txApproval.asPublic = toPlainMessage(asPublic);
        state.txApproval.asReceiver = toPlainMessage(asReceiver);
        state.txApproval.transactionClassification = transactionClassification.type;
      });
    },

    setChoice: choice => {
      set(state => {
        state.txApproval.choice = choice;
      });
    },

    resetReady: () => {
      set(state => {
        state.txApproval.ready = undefined;
      });
    },

    checkReady: () => {
      const { ready: existingReady } = get().txApproval;

      if (existingReady instanceof Promise) {
        return;
      }

      const ready = Promise.withResolvers<void>();
      set(state => {
        state.txApproval.ready = ready.promise;
      });

      ready.promise.then(
        () => {
          set(state => {
            state.txApproval.ready = true;
          });
        },
        cause => {
          set(state => {
            state.txApproval.ready =
              cause instanceof Error ? cause : new Error('Unknown ready failure', { cause });
          });
        },
      );

      void Promise.resolve()
        .then(async () => {
          const wallet = await reliableGetWallet(get, local);
          const key = await getPasswordKey(session);
          const custody = await wallet.custody(key);
          return custody.ready();
        })
        .then(ready.resolve, ready.reject);

      return ready.promise;
    },

    beginAuth: () => {
      const { auth: existingAuth, authorizeRequest } = get().txApproval;

      if (!authorizeRequest?.plan) {
        throw new ReferenceError('No plan to authorize');
      } else if (existingAuth instanceof Promise) {
        return;
      }

      const auth = Promise.withResolvers<AuthorizationData>();
      set(state => {
        state.txApproval.auth = auth.promise;
      });

      auth.promise.then(
        data => {
          set(state => {
            state.txApproval.auth = toPlainMessage(data);
          });
        },
        cause => {
          set(state => {
            state.txApproval.auth =
              cause instanceof Error ? cause : new Error('Unknown sign failure', { cause });
          });
        },
      );

      void Promise.resolve()
        .then(async () => {
          const wallet = await reliableGetWallet(get, local);
          const keyJson = await session.get('passwordKey');
          const key = await Key.fromJson(keyJson!);
          const custody = await wallet.custody(key);
          return custody.authorizePlan(new TransactionPlan(authorizeRequest.plan));
        })
        .then(auth.resolve, auth.reject);

      return auth.promise;
    },

    sendResponse: () => {
      const { responder } = get().txApproval;

      if (!responder) {
        throw new ReferenceError('No responder');
      }

      const { invalidPlan, choice, authorizeRequest, auth } = get().txApproval;

      try {
        if (!choice || !authorizeRequest) {
          throw new ReferenceError('Missing response data');
        } else if (invalidPlan) {
          throw invalidPlan;
        } else if (choice !== UserChoice.Approved) {
          throw new ConnectError('Authorization denied', Code.PermissionDenied);
        }
      } catch (cause) {
        responder.reject(cause);
        throw cause;
      }

      if (!auth) {
        throw new ReferenceError('No authorization available');
      }

      responder.resolve(
        (auth instanceof Error ? Promise.reject(auth) : Promise.resolve(auth)).then(
          data => ({
            authorizeResponse: new AuthorizeResponse({ data }).toJson() as JsonObject,
          }),
          (cause: unknown) => {
            if (isLedgerError(cause) && cause.returnCode === LedgerError.TransactionRejected) {
              throw ConnectError.from(cause, Code.PermissionDenied);
            }
            throw cause;
          },
        ),
      );
    },
  });

export const txApprovalSelector = (state: AllSlices) => {
  const { invalidPlan, auth, ready } = state.txApproval;

  const hasError =
    invalidPlan ?? (ready instanceof Error ? ready : auth instanceof Error ? auth : undefined);

  return {
    ...state.txApproval,
    hasError,
  };
};

/** @todo - getActiveWallet is unreliable if called too early */
const reliableGetWallet = (
  getState: () => AllSlices,
  localStorage: ExtensionStorage<LocalStorageState>,
) =>
  getActiveWallet(getState()) ??
  localStorage // fall back to direct storage access
    .get('wallets')
    .then(([walletJson0]) => Wallet.fromJson(walletJson0!));

const getPasswordKey = (sessionStorage: ExtensionStorage<SessionStorageState>) =>
  sessionStorage.get('passwordKey').then(keyJson => Key.fromJson(keyJson!));
