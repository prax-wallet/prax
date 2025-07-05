import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import type { CustodyInstance } from './custody/types';
import { getCustodyImplByName, getCustodyImplName } from './custody';
import type { PlainMessage } from '@bufbuild/protobuf';
import type {
  CustodyImpl,
  CustodyImplJson,
  CustodyImplName,
  CustodyImplParam,
} from './custody/impls';

// Stored in chrome.local.storage
export interface WalletJson<T extends string = string> {
  // stringified WalletId
  id: string;
  label: string;
  // stringified FullViewingKey
  fullViewingKey: string;
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

    if (Object.keys(custody).length > 1 && 'custodyType' in custody) {
      instance = custody;
    } else if (Object.keys(custody).length === 1 && !('custodyType' in custody)) {
      const [[custodyType, custodyParam]] = Object.entries(custody) as [[T, CustodyImplParam[T]]];
      const impl: CustodyImpl[T] = getCustodyImplByName(custodyType);
      instance = new impl(custodyParam);
    } else {
      throw new TypeError('Invalid custody', { cause: custody });
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
      WalletId.fromJsonString(json.id),
      FullViewingKey.fromJsonString(json.fullViewingKey),
      custody,
    );
  }

  public toJson(): WalletJson<T> {
    return {
      label: this.label,
      id: new WalletId(this.id).toJsonString(),
      fullViewingKey: new FullViewingKey(this.fullViewingKey).toJsonString(),
      custody: this.custody.toJson(),
    } as WalletJson<T>;
  }
}
