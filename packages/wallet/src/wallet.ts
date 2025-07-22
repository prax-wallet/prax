import { toPlainMessage, type PlainMessage } from '@bufbuild/protobuf';
import {
  FullViewingKey,
  SpendKey,
  WalletId,
} from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { authorizePlan } from '@penumbra-zone/wasm/build';
import { generateSpendKey } from '@penumbra-zone/wasm/keys';
import { Box, BoxJson } from '@repo/encryption/box';
import { Key } from '@repo/encryption/key';
import { getCustodyType } from './custody';

export interface WalletJson<T extends string = string> {
  id: { inner: string };
  label: string;
  fullViewingKey: { inner: string };
  custody: Record<T, BoxJson>;
}

export class Wallet<T extends string = string> {
  public readonly custodyType: T;
  private readonly custodyBox: Box;

  constructor(
    public readonly label: string,
    public readonly id: PlainMessage<WalletId>,
    public readonly fullViewingKey: PlainMessage<FullViewingKey>,
    custodyData: Record<T, Box>,
  ) {
    if (!label || typeof label !== 'string') {
      throw new TypeError(`Wallet "${label}" label is not valid`, { cause: label });
    }

    if (!new WalletId(id).equals(id)) {
      throw new TypeError(`Wallet "${label}" id is not valid`, { cause: id });
    }
    this.id = toPlainMessage(new WalletId(id));

    if (!new FullViewingKey(fullViewingKey).equals(fullViewingKey)) {
      throw new TypeError(`Wallet "${label}" full viewing key is not valid`, {
        cause: fullViewingKey,
      });
    }
    this.fullViewingKey = toPlainMessage(new FullViewingKey(fullViewingKey));

    this.custodyType = getCustodyType(custodyData);
    this.custodyBox = custodyData[this.custodyType];
  }

  async custody(passKey: Key) {
    const unsealed = await passKey.unseal(this.custodyBox);
    if (unsealed == null) {
      throw new Error(`Wrong key for "${this.label}" custody box`);
    }

    return {
      authorizePlan: async (plan: TransactionPlan): Promise<AuthorizationData> => {
        switch (this.custodyType) {
          case 'encryptedSeedPhrase': {
            const spendKey = generateSpendKey(unsealed);
            return Promise.resolve(authorizePlan(spendKey, plan));
          }
          case 'encryptedSpendKey': {
            const spendKey = SpendKey.fromJsonString(unsealed);
            return Promise.resolve(authorizePlan(spendKey, plan));
          }
          default:
            throw new Error(`Unknown custody type: ${this.custodyType}`);
        }
      },
    };
  }

  public static fromJson<T extends string>(json: WalletJson<T>) {
    const custodyType = getCustodyType(json.custody);

    return new Wallet<T>(
      json.label,
      WalletId.fromJson(json.id),
      FullViewingKey.fromJson(json.fullViewingKey),
      { [custodyType]: Box.fromJson(json.custody[custodyType]) } as Record<T, Box>,
    );
  }

  public toJson(): WalletJson<T> {
    return {
      label: this.label,
      id: new WalletId(this.id).toJson() as { inner: string },
      fullViewingKey: new FullViewingKey(this.fullViewingKey).toJson() as { inner: string },
      custody: { [this.custodyType]: this.custodyBox.toJson() } as Record<T, BoxJson>,
    };
  }
}
