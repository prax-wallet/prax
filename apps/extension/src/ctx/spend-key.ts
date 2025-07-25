import { Code, ConnectError } from '@connectrpc/connect';
import { generateSpendKey } from '@penumbra-zone/wasm/keys';
import { Box } from '@repo/encryption/box';
import { Key } from '@repo/encryption/key';
import { localExtStorage } from '@repo/storage-chrome/local';
import { sessionExtStorage } from '@repo/storage-chrome/session';

export const getSpendKey = async () => {
  const passKeyJson = await sessionExtStorage.get('passwordKey');
  if (!passKeyJson) {
    throw new ConnectError('User must login', Code.Unauthenticated);
  }
  const passKey = await Key.fromJson(passKeyJson);

  const wallet0 = (await localExtStorage.get('wallets'))[0];
  if (!wallet0) {
    throw new ConnectError('No wallet found');
  }

  const seedBox = Box.fromJson(wallet0.custody.encryptedSeedPhrase);
  const seedPhrase = await passKey.unseal(seedBox);
  if (!seedPhrase) {
    throw new ConnectError('Unable to decrypt seed phrase', Code.Unauthenticated);
  }

  return generateSpendKey(seedPhrase);
};
