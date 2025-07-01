import { ExtensionStorageMigrations } from '../base';
import localV0Migration from './local-v1-migration';

export const localMigrations: ExtensionStorageMigrations<1, 0> = {
  0: localV0Migration,
} as const;
