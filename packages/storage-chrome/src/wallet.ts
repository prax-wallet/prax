import { Code, ConnectError } from '@connectrpc/connect';
import {
  FullViewingKey,
  WalletId,
  type SpendKey,
} from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { localExtStorage } from './defaults';
import { Key } from '@penumbra-zone/crypto-web/encryption';
import { generateSpendKey } from '@penumbra-zone/wasm/keys';
import { sessionExtStorage } from './session';
import { Wallet } from '@penumbra-zone/types/wallet';

export const getWallet = async (walletIdx = 0) =>
  localExtStorage
    .get('wallets')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- throw if unavailable
    .then(wallets => Wallet.fromJson(wallets[walletIdx]!))
    .catch((error: unknown) => {
      console.error('Unable to get wallet', { error });
      throw new ConnectError('Unable to get wallet', Code.Internal);
    });

export const getFullViewingKey = async (walletIdx = 0) =>
  getWallet(walletIdx)
    .then(wallet => FullViewingKey.fromJsonString(wallet.fullViewingKey))
    .catch((error: unknown) => {
      console.error('Unable to get full viewing key', { error });
      throw new ConnectError('Unable to get full viewing key', Code.Internal);
    });

export const getWalletId = async (walletIdx = 0) =>
  getWallet(walletIdx)
    .then(wallet => WalletId.fromJsonString(wallet.id))
    .catch((error: unknown) => {
      console.error('Unable to get wallet id', { error });
      throw new ConnectError('Unable to get wallet id', Code.Internal);
    });

export const getSpendKey = async (walletIdx = 0): Promise<SpendKey> => {
  const getPassKey = sessionExtStorage
    .get('passwordKey')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- throw if unavailable
    .then(passKeyJson => Key.fromJson(passKeyJson!));

  const getSeedBox = getWallet(walletIdx).then(wallet => wallet.custody.encryptedSeedPhrase);

  const getSpendKey = Promise.all([getPassKey, getSeedBox])
    .then(([passKey, seedBox]) => passKey.unseal(seedBox))
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- throw if unavailable
    .then(seedPhrase => generateSpendKey(seedPhrase!));

  return getSpendKey.catch((error: unknown) => {
    console.error('Unable to get spend key', { error });
    throw new ConnectError('Unable to get spend key', Code.Internal);
  });
};
