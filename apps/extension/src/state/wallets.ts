import type { ExtensionStorage } from '@repo/storage-chrome/base';
import type { LocalStorageState } from '@repo/storage-chrome/local';
import type { SessionStorageState } from '@repo/storage-chrome/session';
import { Wallet, type WalletJson } from '@repo/wallet';
import type { AllSlices, SliceCreator } from '.';

export interface WalletsSlice {
  all: WalletJson[];
}

export const createWalletsSlice = (
  _session: ExtensionStorage<SessionStorageState>,
  _local: ExtensionStorage<LocalStorageState>,
): SliceCreator<WalletsSlice> => {
  return (_set, _get, _store) => ({
    all: [],
  });
};

export const activeWalletSelector = (state: AllSlices) =>
  state.wallets.all[0] && Wallet.fromJson(state.wallets.all[0]);
