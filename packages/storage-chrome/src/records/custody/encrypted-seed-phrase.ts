import { PlainMessage } from '@bufbuild/protobuf';
import { WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { authorizePlan } from '@penumbra-zone/wasm/build';
import { generateSpendKey, getFullViewingKey, getWalletId } from '@penumbra-zone/wasm/keys';
import { Box, BoxJson } from '../../encryption/box';
import { Key } from '../../encryption/key';
import { sessionExtStorage } from '../../session';
import { CustodyConstructor, CustodyInstance } from './types';

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

  private async getSpendKey() {
    const passKeyJson = await sessionExtStorage.get('passwordKey');
    if (!passKeyJson) {
      throw new ReferenceError('No session key');
    }
    const passKey = await Key.fromJson(passKeyJson);

    const seedPhrase = await passKey.unseal(this.encryptedSeedPhrase);
    if (!seedPhrase) {
      throw new Error('Unable to decrypt seed phrase');
    }

    return generateSpendKey(seedPhrase);
  }

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
