import { Key } from '@repo/encryption/key';
import { Box } from '@repo/encryption/box';
import { assertWalletCustodyType, Wallet, type WalletJson } from '@repo/wallet';
import { generateSpendKey, getFullViewingKey, getWalletId } from '@penumbra-zone/wasm/keys';
import type { ExtensionStorage } from '@repo/storage-chrome/base';
import type { LocalStorageState } from '@repo/storage-chrome/local';
import type { SessionStorageState } from '@repo/storage-chrome/session';
import { AllSlices, SliceCreator } from '.';

export interface WalletsSlice {
  all: WalletJson[];
  addWallet: (toAdd: { label: string; seedPhrase: string[] }) => Promise<void>;
  getSeedPhrase: () => Promise<string[]>;
}

export const createWalletsSlice =
  (
    session: ExtensionStorage<SessionStorageState>,
    local: ExtensionStorage<LocalStorageState>,
  ): SliceCreator<WalletsSlice> =>
  (set, get) => {
    return {
      all: [],
      addWallet: async ({ label, seedPhrase }) => {
        const seedPhraseStr = seedPhrase.join(' ');
        const spendKey = generateSpendKey(seedPhraseStr);
        const fullViewingKey = getFullViewingKey(spendKey);

        const passwordKey = await session.get('passwordKey');
        if (passwordKey === undefined) {
          throw new Error('Password Key not in storage');
        }

        const key = await Key.fromJson(passwordKey);
        const encryptedSeedPhrase = await key.seal(seedPhraseStr);
        const walletId = getWalletId(fullViewingKey);
        const newWallet = new Wallet(label, walletId, fullViewingKey, { encryptedSeedPhrase });

        set(state => {
          state.wallets.all.unshift(newWallet.toJson());
        });

        const wallets = await local.get('wallets');
        await local.set('wallets', [newWallet.toJson(), ...wallets]);
      },

      getSeedPhrase: async () => {
        const passwordKey = await session.get('passwordKey');
        if (!passwordKey) {
          throw new Error('no password set');
        }

        const key = await Key.fromJson(passwordKey);
        const activeWallet = getActiveWallet(get());
        if (!activeWallet) {
          throw new Error('no wallet set');
        }

        assertWalletCustodyType(activeWallet, 'encryptedSeedPhrase');

        const phraseBox = Box.fromJson(activeWallet.toJson().custody.encryptedSeedPhrase);

        const phrase = await key.unseal(phraseBox);
        if (!phrase) {
          throw new Error('Unable to decrypt seed phrase with password');
        }

        return phrase.split(' ');
      },
    };
  };

export const walletsSelector = (state: AllSlices) => state.wallets;
export const getActiveWallet = (state: AllSlices) =>
  state.wallets.all[0] && Wallet.fromJson(state.wallets.all[0]);
