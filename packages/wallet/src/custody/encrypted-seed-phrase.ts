import { type PlainMessage, toPlainMessage } from '@bufbuild/protobuf';
import { WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import {
  type AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { authorizePlan } from '@penumbra-zone/wasm/build';
import { generateSpendKey, getFullViewingKey, getWalletId } from '@penumbra-zone/wasm/keys';
import { Box, type BoxJson } from '@repo/encryption/box';
import type { Key } from '@repo/encryption/key';
import type { CustodyConstructor, CustodyInstance } from './types';

type CustodyEncryptedSeedPhraseInstance = CustodyInstance<'encryptedSeedPhrase', BoxJson>;
type CustodyEncryptedSeedPhraseConstructor = CustodyConstructor<
  'encryptedSeedPhrase',
  BoxJson,
  Box
>;

class CustodyEncryptedSeedPhrase implements CustodyEncryptedSeedPhraseInstance {
  public static readonly custodyType = 'encryptedSeedPhrase';
  public readonly custodyType = 'encryptedSeedPhrase';

  constructor(private readonly encryptedSeedPhrase: Box) {}

  async authorize(
    passKey: Key,
    assertId: PlainMessage<WalletId>,
    plan: PlainMessage<TransactionPlan>,
  ): Promise<PlainMessage<AuthorizationData>> {
    const seedPhrase = await passKey.unseal(this.encryptedSeedPhrase);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- will throw if null
    const spendKey = generateSpendKey(seedPhrase!);

    const confirmId = getWalletId(getFullViewingKey(spendKey));
    if (!confirmId.equals(assertId)) {
      throw new RangeError('Wrong wallet', { cause: assertId });
    }

    return toPlainMessage(authorizePlan(spendKey, new TransactionPlan(plan)));
  }

  public static fromJson(json: {
    encryptedSeedPhrase: BoxJson;
  }): CustodyEncryptedSeedPhraseInstance {
    return new CustodyEncryptedSeedPhrase(Box.fromJson(json.encryptedSeedPhrase));
  }

  toJson(): { encryptedSeedPhrase: BoxJson } {
    return { encryptedSeedPhrase: this.encryptedSeedPhrase.toJson() };
  }
}

export default CustodyEncryptedSeedPhrase satisfies CustodyEncryptedSeedPhraseConstructor as CustodyEncryptedSeedPhraseConstructor;
