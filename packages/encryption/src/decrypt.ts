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
