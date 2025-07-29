import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { Box, BoxJson } from '@repo/encryption/box';
import { Key } from '@repo/encryption/key';
import { CustodyNamedValue, CustodyTypeName, getCustodyTypeName } from './custody/types';

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

  async custody(passKey: Key) {
    const unsealed = await passKey.unseal(this.custodyBox);
    if (unsealed == null) {
      throw new Error(`Wrong key for "${this.label}" custody box`);
    }

    const {
      default: { [this.custodyType]: authorizePlanImpl },
    } = await import('./custody/authorize-plan');

    return {
      authorizePlan: authorizePlanImpl.bind(this, unsealed),
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
