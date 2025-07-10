import { describe, expect, test } from 'vitest';
import { Box } from '@repo/encryption/box';
import { Wallet, type WalletJson } from './wallet';

describe('Wallet', () => {
  const mockBox = new Box(
    new Uint8Array([72, 101, 108, 108, 111]),
    new Uint8Array([87, 111, 114, 108, 100]),
  );

  const mockWalletJson: WalletJson = {
    id: 'test-wallet-id',
    label: 'Test Wallet',
    fullViewingKey: 'test-fvk-12345',
    custody: { encryptedSeedPhrase: mockBox.toJson() },
  };

  describe('constructor', () => {
    test('creates a Wallet instance with provided properties', () => {
      const wallet = new Wallet('Test Wallet', 'test-id', 'test-fvk', {
        encryptedSeedPhrase: mockBox,
      });

      expect(wallet.label).toBe('Test Wallet');
      expect(wallet.id).toBe('test-id');
      expect(wallet.fullViewingKey).toBe('test-fvk');
      expect(wallet.custody.encryptedSeedPhrase).toBe(mockBox);
    });
  });

  describe('fromJson', () => {
    test('creates a Wallet instance from valid JSON', () => {
      const wallet = Wallet.fromJson(mockWalletJson);

      expect(wallet).toBeInstanceOf(Wallet);
      expect(wallet.label).toBe('Test Wallet');
      expect(wallet.id).toBe('test-wallet-id');
      expect(wallet.fullViewingKey).toBe('test-fvk-12345');
      expect(wallet.custody.encryptedSeedPhrase).toBeInstanceOf(Box);
    });

    test('correctly converts Box from JSON', () => {
      const wallet = Wallet.fromJson(mockWalletJson);
      const box = wallet.custody.encryptedSeedPhrase;

      expect(box.nonce).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
      expect(box.cipherText).toEqual(new Uint8Array([87, 111, 114, 108, 100]));
    });

    test('handles empty strings', () => {
      const emptyWalletJson: WalletJson = {
        id: '',
        label: '',
        fullViewingKey: '',
        custody: { encryptedSeedPhrase: mockBox.toJson() },
      };

      const wallet = Wallet.fromJson(emptyWalletJson);

      expect(wallet.id).toBe('');
      expect(wallet.label).toBe('');
      expect(wallet.fullViewingKey).toBe('');
    });

    test('throws if invalid base64 in Box nonce', () => {
      const invalidWalletJson: WalletJson = {
        ...mockWalletJson,
        custody: { encryptedSeedPhrase: { nonce: 'invalid-base64!', cipherText: 'V29ybGQ=' } },
      };

      expect(() => Wallet.fromJson(invalidWalletJson)).toThrow('Invalid character');
    });

    test('throws if invalid base64 in Box cipherText', () => {
      const invalidWalletJson: WalletJson = {
        ...mockWalletJson,
        custody: { encryptedSeedPhrase: { nonce: 'SGVsbG8=', cipherText: 'invalid-base64!' } },
      };

      expect(() => Wallet.fromJson(invalidWalletJson)).toThrow('Invalid character');
    });

    test('throws if missing custody property', () => {
      expect(() => {
        // @ts-expect-error Testing missing property
        Wallet.fromJson({
          id: 'test-id',
          label: 'Test Wallet',
          fullViewingKey: 'test-fvk',
        });
      }).toThrow('Cannot read');
    });

    test('throws if missing encryptedSeedPhrase', () => {
      expect(() => {
        Wallet.fromJson({
          id: 'test-id',
          label: 'Test Wallet',
          fullViewingKey: 'test-fvk',
          custody: {} as never,
        });
      }).toThrow('Cannot read');
    });

    test.fails('null values in JSON', () => {
      expect(() => {
        Wallet.fromJson({
          id: null,
          label: null,
          fullViewingKey: null,
          custody: { encryptedSeedPhrase: mockBox.toJson() },
        } as never);
      }).toThrow();
    });
  });

  describe('toJson', () => {
    test('converts Wallet instance to JSON', () => {
      const wallet = new Wallet('Test Wallet', 'test-id', 'test-fvk', {
        encryptedSeedPhrase: mockBox,
      });

      const json = wallet.toJson();

      expect(json).toEqual({
        label: 'Test Wallet',
        id: 'test-id',
        fullViewingKey: 'test-fvk',
        custody: { encryptedSeedPhrase: mockBox.toJson() },
      });
    });

    test('correctly converts Box to JSON', () => {
      const wallet = new Wallet('Test Wallet', 'test-id', 'test-fvk', {
        encryptedSeedPhrase: mockBox,
      });

      const expectBoxJson = mockBox.toJson();

      const json = wallet.toJson();

      expect(json.custody.encryptedSeedPhrase).toEqual(expectBoxJson);
    });

    test('serialization produces expected JSON', () => {
      const wallet = new Wallet('Test', 'id', 'fvk', {
        encryptedSeedPhrase: mockBox,
      });

      const json = wallet.toJson();
      const jsonString = JSON.stringify(json);
      const parsed = JSON.parse(jsonString) as WalletJson;

      expect(parsed).toEqual(json);
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('label');
      expect(parsed).toHaveProperty('fullViewingKey');
      expect(parsed).toHaveProperty('custody');
      expect(parsed.custody).toHaveProperty('encryptedSeedPhrase');
    });

    test('fromJson and toJson are inverse operations', () => {
      const originalJson = mockWalletJson;
      const wallet = Wallet.fromJson(originalJson);
      const serializedJson = wallet.toJson();

      expect(serializedJson).toEqual(originalJson);
    });

    test('toJson and fromJson are inverse operations', () => {
      const originalWallet = new Wallet('Test Wallet', 'test-id', 'test-fvk', {
        encryptedSeedPhrase: mockBox,
      });
      const json = originalWallet.toJson();
      const deserializedWallet = Wallet.fromJson(json);

      expect(deserializedWallet.label).toBe(originalWallet.label);
      expect(deserializedWallet.id).toBe(originalWallet.id);
      expect(deserializedWallet.fullViewingKey).toBe(originalWallet.fullViewingKey);
      expect(deserializedWallet.custody.encryptedSeedPhrase.nonce).toEqual(
        originalWallet.custody.encryptedSeedPhrase.nonce,
      );
      expect(deserializedWallet.custody.encryptedSeedPhrase.cipherText).toEqual(
        originalWallet.custody.encryptedSeedPhrase.cipherText,
      );
    });
  });
});
