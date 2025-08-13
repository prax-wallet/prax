import {
  FullViewingKey,
  type WalletId,
} from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { getWalletId } from '@penumbra-zone/wasm/keys';
import { Box, type BoxJson } from '@repo/encryption/box';
import type { Key } from '@repo/encryption/key';
import { bindCustodyImpl } from './custody/impls';
import { type CustodyNamedValue, type CustodyTypeName, getCustodyTypeName } from './custody/util';
import type { WalletCustody } from './custody/wallet-custody';

export interface WalletJson<T extends CustodyTypeName = CustodyTypeName> {
  label: string;
  fullViewingKey: { inner: string };
  custody: CustodyNamedValue<BoxJson, T>;
}

/**
 * Abstracts details of custody implementation.  Call {@link Wallet.custody}
 * with the appropriate key to access custody utilities.
 */
export class Wallet<T extends CustodyTypeName = CustodyTypeName> {
  private readonly custodyBox: Box;

  public readonly custodyType: T;
  public readonly id: WalletId;

  /**
   * @param label Arbitrary string identifier
   * @param fullViewingKey View-only key with no transaction authority
   * @param custodyData Encrypted data identified by {@link CustodyTypeName}
   */
  constructor(
    public readonly label: string,
    public readonly fullViewingKey: FullViewingKey,
    custodyData: CustodyNamedValue<Box, T>,
  ) {
    if (!label || typeof label !== 'string') {
      throw new TypeError(`Wallet "${label}" label is not valid`, { cause: label });
    }

    if (!new FullViewingKey(fullViewingKey).equals(fullViewingKey)) {
      throw new TypeError(`Wallet "${label}" full viewing key is not valid`, {
        cause: fullViewingKey,
      });
    }

    // this derivation validates the fvk
    this.id = getWalletId(fullViewingKey);

    this.custodyType = getCustodyTypeName(custodyData);
    this.custodyBox = custodyData[this.custodyType];

    if (!(this.custodyBox instanceof Box)) {
      throw new TypeError(`Wallet "${label}" custody box is not valid`, { cause: custodyData });
    }
  }

  /**
   * Unseal the wallet's custody box.
   *
   * @param passKey the correct key
   * @throws Error if the key is incorrect
   */
  protected async unseal(passKey: Key) {
    const unsealed = await passKey.unseal(this.custodyBox);
    if (unsealed == null) {
      throw new Error(`Wrong key for "${this.label}" custody box`);
    }

    return unsealed;
  }

  /**
   * Unseal the wallet's custody box to access wallet utilities.
   *
   * @param passKey the correct password key
   * @throws Error if the key is incorrect
   */
  async custody(passKey: Key): Promise<WalletCustody> {
    const unsealed = await this.unseal(passKey);
    return bindCustodyImpl(this, unsealed);
  }

  public static fromJson<J extends CustodyTypeName>(json: WalletJson<J>): Wallet<J> {
    const custodyType = getCustodyTypeName(json.custody);
    const custodyBox = Box.fromJson(json.custody[custodyType]);

    const custodyData = { [custodyType]: custodyBox } as CustodyNamedValue<Box, J>;

    return new Wallet<J>(json.label, FullViewingKey.fromJson(json.fullViewingKey), custodyData);
  }

  public toJson(): WalletJson<T> {
    return {
      label: this.label,
      fullViewingKey: this.fullViewingKey.toJson() as { inner: string },
      custody: { [this.custodyType]: this.custodyBox.toJson() } as CustodyNamedValue<BoxJson, T>,
    };
  }

  public toJSON() {
    return this.toJson();
  }
}
