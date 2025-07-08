import { PlainMessage } from '@bufbuild/protobuf';
import { SpendKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { authorizePlan } from '@penumbra-zone/wasm/build';
import { getFullViewingKey, getWalletId } from '@penumbra-zone/wasm/keys';
import { Box, BoxJson } from '../../encryption/box';
import { Key } from '../../encryption/key';
import { sessionExtStorage } from '../../session';
import { CustodyConstructor, CustodyInstance } from './types';

type CustodyEncryptedSpendKeyInstance = CustodyInstance<'encryptedSpendKey', BoxJson>;
type CustodyEncryptedSpendKeyConstructor = CustodyConstructor<'encryptedSpendKey', BoxJson, Box>;

class CustodyEncryptedSpendKey implements CustodyEncryptedSpendKeyInstance {
  public static readonly custodyType = 'encryptedSpendKey';
  public readonly custodyType = 'encryptedSpendKey';

  constructor(private readonly encryptedSpendKey: Box) {}

  async authorize(
    assertId: PlainMessage<WalletId>,
    plan: PlainMessage<TransactionPlan>,
  ): Promise<PlainMessage<AuthorizationData>> {
    const spendKey = await this.getSpendKey();

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

  private async getSpendKey() {
    const passKeyJson = await sessionExtStorage.get('passwordKey');
    if (!passKeyJson) {
      throw new ReferenceError('No session password');
    }
    const passKey = await Key.fromJson(passKeyJson);

    const spendKey = await passKey.unseal(this.encryptedSpendKey);
    if (!spendKey) {
      throw new Error('Unable to decrypt spend key');
    }

    return SpendKey.fromJsonString(spendKey);
  }
}

export default CustodyEncryptedSpendKey satisfies CustodyEncryptedSpendKeyConstructor as CustodyEncryptedSpendKeyConstructor;
