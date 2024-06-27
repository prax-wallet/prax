import { AllSlices, SliceCreator } from '.';
import { generateSpendKey, getFullViewingKey, getWalletId } from '@penumbra-zone/wasm/keys';
import { Key } from '@penumbra-zone/crypto-web/encryption';
import { ExtensionStorage } from '../storage/base';
import { LocalStorageState } from '../storage/types';
import { Wallet, WalletCreate } from '@penumbra-zone/types/wallet';

export interface WalletsSlice {
  all: Wallet[];
  addWallet: (toAdd: WalletCreate) => Promise<Wallet>;
  getSeedPhrase: () => Promise<string[]>;
}

export const createWalletsSlice =
  (local: ExtensionStorage<LocalStorageState>): SliceCreator<WalletsSlice> =>
  (set, get) => {
    return {
      all: [],
      addWallet: async ({ label, seedPhrase }) => {
        const seedPhraseStr = seedPhrase.join(' ');
        const spendKey = generateSpendKey(seedPhraseStr);
        const fullViewingKey = getFullViewingKey(spendKey);

        const passwordKey = get().password.key;
        if (passwordKey === undefined) throw new Error('Password Key not in storage');

        const key = await Key.fromJson(passwordKey);
        const encryptedSeedPhrase = await key.seal(seedPhraseStr);
        const walletId = getWalletId(fullViewingKey);
        const newWallet = new Wallet(
          label,
          walletId.toJsonString(),
          fullViewingKey.toJsonString(),
          { encryptedSeedPhrase },
        );

        set(state => {
          state.wallets.all.unshift(newWallet);
        });

        const wallets = await local.get('wallets');
        await local.set('wallets', [newWallet.toJson(), ...wallets]);
        return newWallet;
      },
      getSeedPhrase: async () => {
        const passwordKey = get().password.key;
        if (!passwordKey) throw new Error('no password set');

        const key = await Key.fromJson(passwordKey);
        const activeWallet = getActiveWallet(get());
        if (!activeWallet) throw new Error('no wallet set');

        const decryptedSeedPhrase = await key.unseal(activeWallet.custody.encryptedSeedPhrase);
        if (!decryptedSeedPhrase) throw new Error('Unable to decrypt seed phrase with password');

        return decryptedSeedPhrase.split(' ');
      },
    };
  };

export const walletsSelector = (state: AllSlices) => state.wallets;
export const getActiveWallet = (state: AllSlices) => state.wallets.all[0];
