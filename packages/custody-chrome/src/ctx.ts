import { Code, ConnectError, createContextKey } from '@connectrpc/connect';
import {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';

export const authorizeCtx = createContextKey<(plan: TransactionPlan) => Promise<AuthorizationData>>(
  () => Promise.reject(new ConnectError('default authorizeCtx', Code.Unimplemented)),
);
