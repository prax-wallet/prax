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
import {
  assertCustodyTypeName,
  CustodyNamedValue,
  CustodyTypeName,
  getCustodyTypeName,
} from './custody';

export interface WalletCustody {
  authorizePlan: (plan: TransactionPlan) => Promise<AuthorizationData>;
}

export interface WalletJson<T extends CustodyTypeName = CustodyTypeName> {
  id: string;
  label: string;
  fullViewingKey: string;
  custody: CustodyNamedValue<BoxJson, T>;
}

export class Wallet<T extends CustodyTypeName = CustodyTypeName> {
  public readonly custodyType: T;
  private readonly custodyBox: Box;

  constructor(
    public readonly label: string,
    public readonly id: WalletId,
    public readonly fullViewingKey: FullViewingKey,
    custodyData: CustodyNamedValue<Box, T>,
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

    if (!(this.custodyBox instanceof Box)) {
      throw new TypeError(`Wallet "${label}" custody box is not valid`, { cause: this.custodyBox });
    }
  }

  async custody(passKey: Key): Promise<WalletCustody> {
    const unsealed = await passKey.unseal(this.custodyBox);
    if (unsealed == null) {
      throw new Error(`Wrong key for "${this.label}" custody box`);
    }

    return {
      authorizePlan: async (plan: TransactionPlan): Promise<AuthorizationData> => {
        assertCustodyTypeName(this.custodyType);
        switch (this.custodyType) {
          case 'encryptedSeedPhrase': {
            // unsealed is the seed phrase string
            const spendKey = generateSpendKey(unsealed);
            return Promise.resolve(authorizePlan(spendKey, plan));
          }
          case 'encryptedSpendKey': {
            // unsealed is the spend key string
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

  public static fromJson<J extends CustodyTypeName>(json: WalletJson<J>): Wallet<J> {
    const custodyType = getCustodyTypeName(json.custody);
    const custodyBox = Box.fromJson(json.custody[custodyType]);

    const custodyData = { [custodyType]: custodyBox } as CustodyNamedValue<Box, J>;

    return new Wallet<J>(
      json.label,
      WalletId.fromJsonString(json.id),
      FullViewingKey.fromJsonString(json.fullViewingKey),
      custodyData,
    );
  }

  public toJson(): WalletJson<T> {
    return {
      label: this.label,
      id: this.id.toJsonString(),
      fullViewingKey: this.fullViewingKey.toJsonString(),
      custody: { [this.custodyType]: this.custodyBox.toJson() } as CustodyNamedValue<BoxJson, T>,
    };
  }
}
