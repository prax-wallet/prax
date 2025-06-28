import { ExtensionStorageMigrations } from '../base';
import localV0Migration from './local-v0-to-v1';

export const localMigrations: ExtensionStorageMigrations<1, 0> = {
  0: localV0Migration,
} as const;
