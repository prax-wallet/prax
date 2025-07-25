import { describe, expect, test } from 'vitest';
import { Key } from './key';
import { KeyPrint } from './key-print';
import { Box } from './box';

describe('encryption', () => {
  describe('Key', () => {
    const password = 's0meUs3rP@ssword';
    const seedPhrase = 'correct horse battery staple';

    describe('create', () => {
      test('successfully creates a Key and KeyPrint instance', async () => {
        const { key, keyPrint } = await Key.create(password);
        expect(key).toBeInstanceOf(Key);
        expect(keyPrint).toBeInstanceOf(KeyPrint);
      });
    });

    describe('recreate', () => {
      test('successfully recreates the original Key', async () => {
        const { key: originalKey, keyPrint } = await Key.create(password);
        const recreatedKey = await Key.recreate(password, keyPrint);
        expect(recreatedKey).toBeInstanceOf(Key);

        const originalBox = await originalKey.seal(seedPhrase);
        const recreatedBox = await recreatedKey!.seal(seedPhrase);

        const originalUnsealedMessage = await originalKey.unseal(originalBox);
        const recreatedUnsealedMessage = await recreatedKey!.unseal(recreatedBox);

        expect(originalUnsealedMessage).toEqual(seedPhrase);
        expect(originalUnsealedMessage).toEqual(recreatedUnsealedMessage);
      });

      test('returns null when the password is incorrect', async () => {
        const { keyPrint } = await Key.create(password);
        const recreatedKey = await Key.recreate('wrongPassword', keyPrint);
        expect(recreatedKey).toBeNull();
      });
    });

    describe('seal', () => {
      test('successfully encrypts a message', async () => {
        const { key } = await Key.create(password);
        const box = await key.seal(seedPhrase);
        expect(box).toBeInstanceOf(Box);
      });
    });

    describe('unseal', () => {
      test('successfully decrypts a message', async () => {
        const { key } = await Key.create(password);
        const box = await key.seal(seedPhrase);
        const unsealedMessage = await key.unseal(box);

        expect(unsealedMessage).toEqual(seedPhrase);
      });

      test('returns null when the box cannot be decrypted (OperationError)', async () => {
        const { key: key1 } = await Key.create(password);
        const { key: key2 } = await Key.create('anotherPassword');
        const box = await key1.seal(seedPhrase);
        const unsealedMessage = await key2.unseal(box);

        expect(unsealedMessage).toBeNull();
      });

      test('returns a null with bad inputs', async () => {
        const { key } = await Key.create(password);
        // @ts-expect-error intentionally passing wrong types
        const unsealedMessage = await key.unseal({ nonce: 123, cipherText: 456 });
        expect(unsealedMessage).toBeNull();
      });
    });
  });

  describe('KeyPrint', () => {
    const testHash = new Uint8Array([1, 2, 3]);
    const testSalt = new Uint8Array([4, 5, 6]);
    const testHashBase64 = 'AQID';
    const testSaltBase64 = 'BAUG';

    test('constructor correctly assigns hash and salt', () => {
      const keyPrint = new KeyPrint(testHash, testSalt);

      expect(keyPrint.hash).toEqual(testHash);
      expect(keyPrint.salt).toEqual(testSalt);
    });

    test('correctly creates a KeyPrint from JSON', () => {
      const json = { hash: testHashBase64, salt: testSaltBase64 };
      const keyPrint = KeyPrint.fromJson(json);

      expect(keyPrint.hash).toEqual(testHash);
      expect(keyPrint.salt).toEqual(testSalt);
    });

    test('correctly creates JSON from a KeyPrint', () => {
      const keyPrint = new KeyPrint(testHash, testSalt);
      const json = keyPrint.toJson();

      expect(json).toEqual({ hash: testHashBase64, salt: testSaltBase64 });
    });
  });

  describe('Box', () => {
    const testNonce = new Uint8Array([72, 101, 108, 108, 111]);
    const testCipherText = new Uint8Array([87, 111, 114, 108, 100]);
    const testNonceBase64 = 'SGVsbG8=';
    const testCipherTextBase64 = 'V29ybGQ=';

    describe('constructor', () => {
      test('correctly assigns nonce and cipherText', () => {
        const box = new Box(testNonce, testCipherText);

        expect(box.nonce).toEqual(testNonce);
        expect(box.cipherText).toEqual(testCipherText);
      });
    });

    describe('fromJson', () => {
      test('correctly creates a Box from JSON', () => {
        const json = { nonce: testNonceBase64, cipherText: testCipherTextBase64 };
        const box = Box.fromJson(json);

        expect(box.nonce).toEqual(testNonce);
        expect(box.cipherText).toEqual(testCipherText);
      });
    });

    describe('toJson', () => {
      test('correctly creates JSON from a Box', () => {
        const box = new Box(testNonce, testCipherText);
        const json = box.toJson();

        expect(json).toEqual({ nonce: testNonceBase64, cipherText: testCipherTextBase64 });
      });
    });
  });
});
