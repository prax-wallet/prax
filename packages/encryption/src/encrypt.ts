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
