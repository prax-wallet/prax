import type { PlainMessage } from '@bufbuild/protobuf';
import type { WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import type {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import type { Key } from '@repo/encryption/key';

export interface CustodyInstance<T extends string, J = unknown> {
  custodyType: T;
  authorize(
    passKey: Key,
    assertId: PlainMessage<WalletId>,
    plan: PlainMessage<TransactionPlan>,
  ): Promise<PlainMessage<AuthorizationData>>;
  toJson(): Record<T, J>;
}

export interface CustodyConstructor<T extends string, J = unknown, C = J> {
  custodyType: T;
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- need to use map
  fromJson(json: { [k in T]: J }): InstanceType<CustodyConstructor<T, J, C>>;
  new (custodyData: C): CustodyInstance<T, J>;
}
