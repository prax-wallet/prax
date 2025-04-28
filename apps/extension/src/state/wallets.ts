import { toPlainMessage } from '@bufbuild/protobuf';
import { Key } from '@penumbra-zone/crypto-web/encryption';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { generateSpendKey, getFullViewingKey, getWalletId } from '@penumbra-zone/wasm/keys';
import { AllSlices, SliceCreator } from '.';
import { ExtensionStorage } from '../storage/base';
import { LocalStorageState } from '../storage/types';
import { Wallet, WalletType, serializeWallet } from '../wallet';

export interface WalletsSlice {
  active?: Wallet;
  addSeedPhraseWallet: (label: string, seedPhrase: string[]) => Promise<Wallet<'SeedPhrase'>>;
  addLedgerWallet: (label: string, fullViewingKey: FullViewingKey) => Promise<Wallet<'Ledger'>>;
}

export const createWalletsSlice =
  (local: ExtensionStorage<LocalStorageState>): SliceCreator<WalletsSlice> =>
  (set, get) => {
    const addToStorage = async <T extends WalletType>(wallet: Wallet<T>) => {
      const storedWallets = await local.get('wallets');
      await local.set('wallets', [serializeWallet(wallet), ...storedWallets]);
    };

    return {
      addSeedPhraseWallet: async (label, seedPhrase) => {
        console.log('addSeedPhraseWallet', label, seedPhrase);
        const seedPhraseStr = seedPhrase.join(' ');
        const spendKey = generateSpendKey(seedPhraseStr);
        const fullViewingKey = getFullViewingKey(spendKey);

        const passwordKey = get().password.key;
        if (passwordKey === undefined) {
          throw new Error('Password Key not in storage');
        }

        const key = await Key.fromJson(passwordKey);
        const encryptedSeedPhrase = await key.seal(seedPhraseStr);
        const walletId = getWalletId(fullViewingKey);
        const newWallet: Wallet<'SeedPhrase'> = {
          label,
          id: toPlainMessage(walletId),
          type: 'SeedPhrase',
          fullViewingKey: toPlainMessage(fullViewingKey),
          encryptedSeedPhrase,
        };

        set(state => {
          state.wallets.active = newWallet;
        });

        await addToStorage(newWallet);

        return newWallet;
      },
      addLedgerWallet: async (label, fullViewingKey) => {
        console.log('addLedgerWallet', label, fullViewingKey);
        const walletId = getWalletId(fullViewingKey);
        const newWallet: Wallet<'Ledger'> = {
          label,
          id: toPlainMessage(walletId),
          type: 'Ledger',
          fullViewingKey: toPlainMessage(fullViewingKey),
          encryptedSeedPhrase: null,
        };

        await addToStorage(newWallet);

        set(state => {
          state.wallets.active = newWallet;
        });

        return newWallet;
      },
    };
  };

export const walletsSelector = (state: AllSlices) => state.wallets;
export const fvkSelector = (state: AllSlices) =>
  state.wallets.active?.fullViewingKey && new FullViewingKey(state.wallets.active.fullViewingKey);
export const activeWalletSelector = (state: AllSlices) => state.wallets.active;
