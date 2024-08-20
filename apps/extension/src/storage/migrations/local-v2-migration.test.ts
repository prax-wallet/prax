import { beforeEach, describe, expect, test } from 'vitest';
import { MockStorageArea } from '../mock';
import { ExtensionStorage } from '../base';
import { localDefaults } from '../local';
import { LocalStorageState, LocalStorageVersion } from '../types';
import { localV1Migrations } from './local-v1-migrations';
import { localV2Migrations } from './local-v2-migrations';

describe('v2 local storage migrations', () => {
  const storageArea = new MockStorageArea();
  let v1ExtStorage: ExtensionStorage<LocalStorageState>;
  let v2ExtStorage: ExtensionStorage<LocalStorageState>;
  let v3ExtStorage: ExtensionStorage<LocalStorageState>;

  beforeEach(() => {
    v1ExtStorage = new ExtensionStorage<LocalStorageState>(
      storageArea,
      localDefaults,
      LocalStorageVersion.V1,
    );

    v2ExtStorage = new ExtensionStorage<LocalStorageState>(
      storageArea,
      localDefaults,
      LocalStorageVersion.V2,
      {
        [LocalStorageVersion.V1]: localV1Migrations,
      },
    );

    v3ExtStorage = new ExtensionStorage<LocalStorageState>(
      storageArea,
      localDefaults,
      LocalStorageVersion.V3,
      {
        [LocalStorageVersion.V1]: localV1Migrations,
        [LocalStorageVersion.V2]: localV2Migrations,
      },
    );
  });

  test('non-affected fields stay the same', async () => {
    await v1ExtStorage.set('fullSyncHeight', 9483729);
    const syncHeight = await v3ExtStorage.get('fullSyncHeight');
    expect(syncHeight).toEqual(9483729);
  });

  describe('frontends', () => {
    test('not set frontend gets ignored', async () => {
      await v1ExtStorage.set('frontendUrl', undefined);
      const url = await v3ExtStorage.get('frontendUrl');
      expect(url).toBeUndefined();
    });
  });

  test('Migration from v1 works the same', async () => {});
});
