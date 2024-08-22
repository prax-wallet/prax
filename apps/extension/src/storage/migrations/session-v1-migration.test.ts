import { beforeEach, describe, expect, test } from 'vitest';
import { MockStorageArea } from '../mock';
import { ExtensionStorage } from '../base';
import { sessionDefaults, SessionStorageState } from '../session';
import {
  sessionV0Migration,
  V0SessionStorageState,
  V0SessionStorageVersion,
} from './session-v1-migration';

describe('v1/v2 old schema: validate grpc & frontendUrl', () => {
  let rawStorage: MockStorageArea;
  let v1ExtStorage: ExtensionStorage<SessionStorageState>;

  beforeEach(() => {
    rawStorage = new MockStorageArea();
    v1ExtStorage = new ExtensionStorage<SessionStorageState>({
      storage: rawStorage,
      defaults: sessionDefaults,
      version: {
        current: 1,
        migrations: {
          0: sessionV0Migration,
        },
      },
    });
  });

  test('non-affected fields stay the same', async () => {
    const jsonWebKey = {
      alg: 'A256GCM',
      ext: true,
      k: '2l2K1HKpGWaOriS58zwdDTwAMtMuczuUQc4IYzGxyhM',
      kty: 'oct',
      key_ops: ['encrypt', 'decrypt'],
    };
    const mock0StorageState: Record<string, unknown> = {
      passwordKey: {
        version: V0SessionStorageVersion.V1,
        value: {
          _inner: jsonWebKey,
        },
      },
    } satisfies Partial<V0SessionStorageState>;
    await rawStorage.set(mock0StorageState);

    const versionA = await rawStorage.get('dbVersion');
    expect(versionA).toStrictEqual({});

    const passwordKey = await v1ExtStorage.get('passwordKey');
    expect(passwordKey?._inner).toEqual(jsonWebKey);
  });

  test('undefined stays undefined', async () => {
    const passwordKey = await v1ExtStorage.get('passwordKey');
    expect(passwordKey).toBeUndefined();
  });
});
