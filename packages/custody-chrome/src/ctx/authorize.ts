import { Code, ConnectError, createContextKey } from '@connectrpc/connect';
import {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';

export const authorizeCtx = createContextKey<
  (txPlan: TransactionPlan) => Promise<AuthorizationData>
>(() => Promise.reject(ConnectError.from('Default authorize stub', Code.Unimplemented)));
