// Hash a password with PBKDF2 using a provided salt
// Meant to hinder brute force or dictionary attacks
export const keyStretchingHash = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const importedKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 210_000,
      hash: 'SHA-512',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
};

// Encrypt a message using AES-GCM
export const encrypt = async (
  message: string,
  nonce: Uint8Array,
  key: CryptoKey,
): Promise<Uint8Array> => {
  const enc = new TextEncoder();
  const buffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    enc.encode(message),
  );
  return new Uint8Array(buffer);
};

// Decrypt a ciphertext using AES-GCM
export const decrypt = async (
  ciphertext: Uint8Array,
  nonce: Uint8Array, // You need to provide both the same nonce & key used for encryption
  key: CryptoKey,
): Promise<string> => {
  const dec = new TextDecoder();
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext);
  return dec.decode(decrypted);
};
