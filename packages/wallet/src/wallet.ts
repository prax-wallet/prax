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
import { assertCustodyTypeName, CustodyTypeName, getCustodyTypeName } from './custody';

export function isWalletCustodyType<T extends CustodyTypeName>(
  w: Wallet,
  checkName: T,
): w is Wallet<T> {
  assertCustodyTypeName(checkName);
  return w.custodyType === checkName;
}

export function assertWalletCustodyType<T extends CustodyTypeName>(
  w: Wallet,
  checkName: T,
): asserts w is Wallet<T> {
  if (!isWalletCustodyType(w, checkName)) {
    throw new TypeError(`Wallet "${w.label}" custody type is not ${checkName}`, {
      cause: w.custodyType,
    });
  }
}

export interface WalletJson<T extends string = string> {
  id: string;
  label: string;
  fullViewingKey: string;
  custody: Record<T, BoxJson>;
}

export class Wallet<T extends string = string> {
  public readonly custodyType: T;
  private readonly custodyBox: Box;

  constructor(
    public readonly label: string,
    public readonly id: WalletId,
    public readonly fullViewingKey: FullViewingKey,
    custodyData: Record<T, Box>,
  ) {
    if (!label || typeof label !== 'string') {
      throw new TypeError(`Wallet "${label}" label is not valid`, { cause: label });
    }

    if (!new WalletId(id).equals(id)) {
      throw new TypeError(`Wallet "${label}" id is not valid`, { cause: id });
    }

    if (!new FullViewingKey(fullViewingKey).equals(fullViewingKey)) {
      throw new TypeError(`Wallet "${label}" full viewing key is not valid`, {
        cause: fullViewingKey,
      });
    }

    this.custodyType = getCustodyTypeName(custodyData);
    this.custodyBox = custodyData[this.custodyType];
  }

  async custody(passKey: Key) {
    const unsealed = await passKey.unseal(this.custodyBox);
    if (unsealed == null) {
      throw new Error(`Wrong key for "${this.label}" custody box`);
    }

    return {
      authorizePlan: async (plan: TransactionPlan): Promise<AuthorizationData> => {
        assertCustodyTypeName(this.custodyType);
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
            // unreachable
            this.custodyType satisfies never;
            throw new Error(`Cannot authorize plan with custody type ${String(this.custodyType)}`, {
              cause: this.custodyType,
            });
        }
      },
    };
  }

  public static fromJson<T extends CustodyTypeName>(json: WalletJson<T>): Wallet<T> {
    const custodyType = getCustodyTypeName(json.custody);

    return new Wallet<T>(
      json.label,
      WalletId.fromJsonString(json.id),
      FullViewingKey.fromJsonString(json.fullViewingKey),
      { [custodyType]: Box.fromJson(json.custody[custodyType]) } as Record<T, Box>,
    );
  }

  public toJson(): WalletJson<T> {
    return {
      label: this.label,
      id: this.id.toJsonString(),
      fullViewingKey: this.fullViewingKey.toJsonString(),
      custody: { [this.custodyType]: this.custodyBox.toJson() } as Record<T, BoxJson>,
    };
  }
}
