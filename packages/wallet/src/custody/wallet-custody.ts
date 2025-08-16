import type {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';

/** The 'open wallet' utilities returned by {@link Wallet.custody}. */
export interface WalletCustody {
  ready: () => Promise<void>;
  authorizePlan: (plan: TransactionPlan) => Promise<AuthorizationData>;
}
