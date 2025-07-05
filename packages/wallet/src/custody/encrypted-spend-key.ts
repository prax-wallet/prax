import type { PlainMessage } from '@bufbuild/protobuf';
import { spendKeyFromBech32m } from '@penumbra-zone/bech32m/penumbraspendkey';
import { SpendKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import {
  type AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { authorizePlan } from '@penumbra-zone/wasm/build';
import { getFullViewingKey, getWalletId } from '@penumbra-zone/wasm/keys';
import { Box, type BoxJson } from '@repo/encryption/box';
import type { Key } from '@repo/encryption/key';
import type { CustodyConstructor, CustodyInstance } from './types';

type CustodyEncryptedSpendKeyInstance = CustodyInstance<'encryptedSpendKey', BoxJson>;
type CustodyEncryptedSpendKeyConstructor = CustodyConstructor<'encryptedSpendKey', BoxJson, Box>;

class CustodyEncryptedSpendKey implements CustodyEncryptedSpendKeyInstance {
  public static readonly custodyType = 'encryptedSpendKey';
  public readonly custodyType = 'encryptedSpendKey';

  constructor(private readonly encryptedSpendKey: Box) {}

  async authorize(
    passKey: Key,
    assertId: PlainMessage<WalletId>,
    plan: PlainMessage<TransactionPlan>,
  ): Promise<PlainMessage<AuthorizationData>> {
    const spendKeyString = await passKey.unseal(this.encryptedSpendKey);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- will throw if null
    const spendKey = new SpendKey(spendKeyFromBech32m(spendKeyString!));

    const confirmId = getWalletId(getFullViewingKey(spendKey));
    if (!confirmId.equals(assertId)) {
      throw new RangeError('Wrong wallet', { cause: assertId });
    }

    return authorizePlan(spendKey, new TransactionPlan(plan));
  }

  public static fromJson(json: { encryptedSpendKey: BoxJson }): CustodyEncryptedSpendKeyInstance {
    return new CustodyEncryptedSpendKey(Box.fromJson(json.encryptedSpendKey));
  }

  toJson(): { encryptedSpendKey: BoxJson } {
    return { encryptedSpendKey: this.encryptedSpendKey.toJson() };
  }
}

export default CustodyEncryptedSpendKey satisfies CustodyEncryptedSpendKeyConstructor as CustodyEncryptedSpendKeyConstructor;
