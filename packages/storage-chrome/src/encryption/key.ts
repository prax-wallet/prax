import { base64ToUint8Array, uint8ArrayToBase64 } from '@penumbra-zone/types/base64';
import { Box } from './box';
import { keyStretchingHash, encrypt, decrypt } from './encryption';

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
const uintArraysEqual = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((num, i) => b[i] === num);

export interface KeyJson {
  _inner: JsonWebKey;
}
// Private key used to encrypt & decrypt messages. Do not expose publicly.

export class Key {
  private constructor(private readonly key: CryptoKey) {}

  // Create a new Key instance from a password. Do not store the Key, only KeyPrint.
  static async create(password: string): Promise<{ key: Key; keyPrint: KeyPrint }> {
    const salt = crypto.getRandomValues(new Uint8Array(16)); // 128 bit
    const key = await keyStretchingHash(password, salt);
    const buffer = await crypto.subtle.exportKey('raw', key);

    // A second, fast hash to hide the result of the former
    const hashedKey = await crypto.subtle.digest('SHA-256', buffer);

    return {
      key: new Key(key),
      keyPrint: new KeyPrint(new Uint8Array(hashedKey), salt),
    };
  }

  // Takes a KeyPrint + password to recreate the original Key
  static async recreate(password: string, print: KeyPrint): Promise<Key | null> {
    const key = await keyStretchingHash(password, print.salt);
    const buffer = await crypto.subtle.exportKey('raw', key);
    const hashedKey = await crypto.subtle.digest('SHA-256', buffer);

    if (!uintArraysEqual(print.hash, new Uint8Array(hashedKey))) {
      return null;
    }
    return new Key(key);
  }

  static async fromJson(jwk: KeyJson): Promise<Key> {
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk._inner,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
    return new Key(key);
  }

  // Encrypts message. Box can be publicly stored.
  async seal(message: string): Promise<Box> {
    const nonce = crypto.getRandomValues(new Uint8Array(12)); // AES uses twelve bytes
    const cipherText = await encrypt(message, nonce, this.key);
    return new Box(nonce, cipherText);
  }

  // Attempts to decrypt Box into message. If failure, returns `null`.
  async unseal(box: Box): Promise<string | null> {
    try {
      // Decrypt the ciphertext using the nonce and key
      return await decrypt(box.cipherText, box.nonce, this.key);
    } catch (e) {
      // Logging a generic unknown error to avoid exposing sensitive information via throwing
      if (!(e instanceof TypeError || (e instanceof DOMException && e.name === 'OperationError'))) {
        console.error('Decryption failed due to an unexpected error.');
      }
      return null;
    }
  }

  async toJson(): Promise<KeyJson> {
    return { _inner: await crypto.subtle.exportKey('jwk', this.key) };
  }
}
