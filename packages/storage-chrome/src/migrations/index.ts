import { ExtensionStorageMigrations } from '../base';
import local_v0_v1 from './v0-v1';
import local_v1_v2 from './v1-v2';

import type { LocalStorageVersion } from '../local';

export const localMigrations: ExtensionStorageMigrations<LocalStorageVersion, 0 | 1> = {
  0: local_v0_v1,
  1: local_v1_v2,
} as const;
