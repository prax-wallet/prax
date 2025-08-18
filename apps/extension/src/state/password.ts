import type { Box } from '@repo/encryption/box';
import { Key } from '@repo/encryption/key';
import { KeyPrint } from '@repo/encryption/key-print';
import type { ExtensionStorage } from '@repo/storage-chrome/base';
import type { LocalStorageState } from '@repo/storage-chrome/local';
import type { SessionStorageState } from '@repo/storage-chrome/session';
import type { AllSlices, SliceCreator } from '.';

export interface PasswordSlice {
  isPassword: (password: string) => Promise<boolean>;
  clearSessionPassword: () => void;
  setSessionPassword: (password: string) => Promise<void>;
  unseal: (box: Box) => Promise<string>;
}

export const createPasswordSlice =
  (
    session: ExtensionStorage<SessionStorageState>,
    local: ExtensionStorage<LocalStorageState>,
  ): SliceCreator<PasswordSlice> =>
  () => {
    return {
      setSessionPassword: async password => {
        const keyPrintJson = await local.get('passwordKeyPrint');
        if (!keyPrintJson) {
          throw new Error('Password KeyPrint not in storage');
        }

        const key = await Key.recreate(password, KeyPrint.fromJson(keyPrintJson));
        if (!key) {
          throw new Error('Password does not match KeyPrint');
        }

        const keyJson = await key.toJson();

        await session.set('passwordKey', keyJson);
      },
      clearSessionPassword: () => {
        void session.remove('passwordKey');
      },
      isPassword: async attempt => {
        const keyPrintJson = await local.get('passwordKeyPrint');
        if (!keyPrintJson) {
          throw new Error('Password KeyPrint not in storage');
        }

        const key = await Key.recreate(attempt, KeyPrint.fromJson(keyPrintJson));
        return Boolean(key);
      },
      unseal: async (box: Box) => {
        const keyJson = await session.get('passwordKey');
        if (!keyJson) {
          throw new Error('Password Key not in state');
        }
        const key = await Key.fromJson(keyJson);
        const unsealed = await key.unseal(box);
        if (!unsealed) {
          throw new Error('Unable to decrypt box with session Key');
        }
        return unsealed;
      },
    };
  };

export const loginSelector = (state: AllSlices) => {
  const { isPassword, setSessionPassword } = state.password;
  return { isPassword, setSessionPassword };
};

export const logoutSelector = (state: AllSlices) => {
  const { clearSessionPassword } = state.password;
  return { clearSessionPassword };
};

export const recoveryPhraseSelector = (state: AllSlices) => {
  const { isPassword, unseal } = state.password;
  return { isPassword, unseal };
};
