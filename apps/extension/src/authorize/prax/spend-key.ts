import { ConnectError, Code } from '@connectrpc/connect';
import { Key } from '@penumbra-zone/crypto-web/encryption';
import { Box } from '@penumbra-zone/types/box';
import { generateSpendKey } from '@penumbra-zone/wasm/keys';
import { localExtStorage } from '../../storage/local';
import { sessionExtStorage } from '../../storage/session';
import { Wallet } from '../../wallet';

const getPassKey = async () => {
  const passKeyJson = await sessionExtStorage.get('passwordKey');
  if (!passKeyJson) {
    throw new ConnectError('User must login', Code.Unauthenticated);
  }
  return Key.fromJson(passKeyJson);
};

const getEncryptedSeedPhrase = async (): Promise<Wallet<'SeedPhrase'>['encryptedSeedPhrase']> => {
  const [wallet0] = await localExtStorage.get('wallets');
  if (wallet0?.type !== 'SeedPhrase' || !wallet0.encryptedSeedPhrase) {
    throw new Error('No seed phrase available');
  }

  return Box.fromJson(wallet0.encryptedSeedPhrase);
};

export const getSpendKey = async () => {
  const passKey = await getPassKey();
  const encryptedSeedPhrase = await getEncryptedSeedPhrase();

  const seedPhrase = await passKey.unseal(encryptedSeedPhrase);
  if (!seedPhrase) {
    throw new ConnectError('Unable to decrypt seed phrase', Code.Unauthenticated);
  }

  return generateSpendKey(seedPhrase);
};
