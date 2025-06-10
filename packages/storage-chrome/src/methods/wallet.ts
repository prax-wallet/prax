import { Code, ConnectError } from '@connectrpc/connect';
import {
  FullViewingKey,
  WalletId,
  type SpendKey,
} from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { Key } from '@penumbra-zone/crypto-web/encryption';
import { generateSpendKey } from '@penumbra-zone/wasm/keys';
import { Wallet } from '@penumbra-zone/types/wallet';
import { ChromeStorageArea } from '../util/chrome-storage-area';
import { PraxStorage } from '../versions/prax-storage';

export const getWallet = async (
  {
    local,
  }: {
    local: ChromeStorageArea<PraxStorage<1>['local']>;
  },
  walletIdx = 0,
) =>
  local
    .get('wallets')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- throw if unavailable
    .then(({ wallets }) => Wallet.fromJson(wallets[walletIdx]!))
    .catch((error: unknown) => {
      console.error('Unable to get wallet', { error });
      throw new ConnectError('Unable to get wallet', Code.Internal);
    });

export const getFullViewingKey = async (
  {
    local,
  }: {
    local: ChromeStorageArea<PraxStorage<1>['local']>;
  },
  walletIdx = 0,
) =>
  getWallet({ local }, walletIdx)
    .then(wallet => FullViewingKey.fromJsonString(wallet.fullViewingKey))
    .catch((error: unknown) => {
      console.error('Unable to get full viewing key', { error });
      throw new ConnectError('Unable to get full viewing key', Code.Internal);
    });

export const getWalletId = async (
  { local }: { local: ChromeStorageArea<PraxStorage<1>['local']> },
  walletIdx = 0,
) =>
  getWallet({ local }, walletIdx)
    .then(wallet => WalletId.fromJsonString(wallet.id))
    .catch((error: unknown) => {
      console.error('Unable to get wallet id', { error });
      throw new ConnectError('Unable to get wallet id', Code.Internal);
    });

export const getSpendKey = async (
  {
    local,
    session,
  }: {
    local: ChromeStorageArea<PraxStorage<1>['local']>;
    session: ChromeStorageArea<PraxStorage<1>['session']>;
  },
  walletIdx = 0,
): Promise<SpendKey> => {
  const getPassKey = session
    .get('passwordKey')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- throw if unavailable
    .then(({ passwordKey }) => Key.fromJson(passwordKey!));

  const getSeedBox = getWallet({ local }, walletIdx).then(
    wallet => wallet.custody.encryptedSeedPhrase,
  );

  const getSpendKey = Promise.all([getPassKey, getSeedBox])
    .then(([passKey, seedBox]) => passKey.unseal(seedBox))
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- throw if unavailable
    .then(seedPhrase => generateSpendKey(seedPhrase!));

  return getSpendKey.catch((error: unknown) => {
    console.error('Unable to get spend key', { error });
    throw new ConnectError('Unable to get spend key', Code.Internal);
  });
};
