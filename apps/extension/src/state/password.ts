import { Key } from '@repo/encryption/key';
import { KeyPrint } from '@repo/encryption/key-print';
import { AllSlices, SliceCreator } from '.';
import type { ExtensionStorage } from '@repo/storage-chrome/base';
import type { LocalStorageState } from '@repo/storage-chrome/local';
import type { SessionStorageState } from '@repo/storage-chrome/session';

// Documentation in /docs/custody.md

export interface PasswordSlice {
  setPassword: (password: string) => Promise<void>;
  isPassword: (password: string) => Promise<boolean>;
  clearSessionPassword: () => void;
  setSessionPassword: (password: string) => Promise<void>;
}

export const createPasswordSlice =
  (
    session: ExtensionStorage<SessionStorageState>,
    local: ExtensionStorage<LocalStorageState>,
  ): SliceCreator<PasswordSlice> =>
  () => {
    return {
      setPassword: async password => {
        const { key, keyPrint } = await Key.create(password);
        const keyJson = await key.toJson();

        await session.set('passwordKey', keyJson);
        await local.set('passwordKeyPrint', keyPrint.toJson());
      },
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
    };
  };

export const passwordSelector = (state: AllSlices) => state.password;
