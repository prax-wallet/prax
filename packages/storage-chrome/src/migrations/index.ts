import { ExtensionStorageMigrations } from '../base';
import local_v0_v1_migration from './local-v1-migration';
import local_v1_v2_migration from './local-v2-migration';

import type { LocalStorageVersion } from '../local';

export const localMigrations: ExtensionStorageMigrations<LocalStorageVersion, 0 | 1> = {
  0: local_v0_v1_migration,
  1: local_v1_v2_migration,
} as const;
