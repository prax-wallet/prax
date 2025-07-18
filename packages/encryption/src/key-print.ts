import { base64ToUint8Array, uint8ArrayToBase64 } from '@penumbra-zone/types/base64';

export interface KeyPrintJson {
  hash: string;
  salt: string;
}

// Used to recreate the original key material
export class KeyPrint {
  constructor(
    readonly hash: Uint8Array,
    readonly salt: Uint8Array,
  ) {}

  static fromJson(json: KeyPrintJson): KeyPrint {
    return new KeyPrint(base64ToUint8Array(json.hash), base64ToUint8Array(json.salt));
  }

  toJson(): KeyPrintJson {
    return {
      hash: uint8ArrayToBase64(this.hash),
      salt: uint8ArrayToBase64(this.salt),
    };
  }
}
