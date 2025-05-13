import { Code, ConnectError, createContextKey } from '@connectrpc/connect';
import { TransactionPlan } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { UserChoice } from '@penumbra-zone/types/user-choice';

export const approveCtx = createContextKey<
  (txPlan: TransactionPlan) => Promise<UserChoice | undefined>
>(() => Promise.reject(ConnectError.from('Default approve stub', Code.Unimplemented)));
