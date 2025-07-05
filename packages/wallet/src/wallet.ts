import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import type { CustodyInstance } from './custody/types';
import { getCustodyImplByName, getCustodyImplName } from './custody';
import { toPlainMessage, type PlainMessage } from '@bufbuild/protobuf';
import type {
  CustodyImpl,
  CustodyImplJson,
  CustodyImplName,
  CustodyImplParam,
} from './custody/impls';

export interface WalletJson<T extends string = string> {
  id: { inner: string };
  label: string;
  fullViewingKey: { inner: string };
  custody: Record<T, CustodyImplJson[Extract<T, CustodyImplName>]>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- wallet may contain any custody
export class Wallet<T extends CustodyImplName = any> {
  public readonly custodyType: T;
  public readonly custody: CustodyInstance<T, CustodyImplJson[T]>;

  constructor(
    public readonly label: string,
    public readonly id: PlainMessage<WalletId>,
    public readonly fullViewingKey: PlainMessage<FullViewingKey>,
    custody: CustodyInstance<T, CustodyImplJson[T]> | Record<T, CustodyImplParam[T]>,
  ) {
    let instance: CustodyInstance<T, CustodyImplJson[T]>;

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

    if (Object.keys(custody).length > 1 && 'custodyType' in custody) {
      instance = custody;
    } else if (Object.keys(custody).length === 1 && !('custodyType' in custody)) {
      const [[custodyType, custodyParam]] = Object.entries(custody) as [[T, CustodyImplParam[T]]];
      const impl: CustodyImpl[T] = getCustodyImplByName(custodyType);
      instance = new impl(custodyParam);
    } else {
      throw new TypeError(`Wallet "${label}" custody is not valid`, { cause: custody });
    }

    this.custody = instance;
    this.custodyType = this.custody.custodyType;
  }

  public static fromJson<T extends string>(json: WalletJson<T>) {
    const custodyType = getCustodyImplName(json.custody);
    const impl: CustodyImpl[typeof custodyType] = getCustodyImplByName(custodyType);
    const custody = impl.fromJson(json.custody);

    return new Wallet<typeof custodyType>(
      json.label,
      WalletId.fromJson(json.id),
      FullViewingKey.fromJson(json.fullViewingKey),
      custody,
    );
  }

  public toJson(): WalletJson<T> {
    return {
      label: this.label,
      id: new WalletId(this.id).toJson(),
      fullViewingKey: new FullViewingKey(this.fullViewingKey).toJson(),
      custody: this.custody.toJson(),
    } as WalletJson<T>;
  }
}
