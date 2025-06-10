import { Version } from './base';

export const ensureMigration = async (
  storage: chrome.storage.StorageArea,
  version: Version,
): Promise<typeof version.current> => {
  let storedVersion = await storage.get('dbVersion').then(({ dbVersion }) => dbVersion as unknown);

  if (storedVersion === version.current) {
    return version.current;
  }

  try {
    if (storedVersion == null) {
      console.warn('Migrating from legacy storage!');
      storedVersion = 0;
    }

    if (typeof storedVersion !== 'number') {
      throw new TypeError(`Storage version type ${typeof storedVersion} is not number`, {
        cause: storedVersion,
      });
    }

    if (storedVersion > version.current) {
      throw new RangeError(`Storage version ${storedVersion} is from the future`, {
        cause: storedVersion,
      });
    }

    let migrationIndex = storedVersion;
    while (migrationIndex < version.current) {
      const migrationFn = version.migrations[migrationIndex];

      if (!migrationFn) {
        break;
      }

      const currentDbState = await storage.get();
      const nextState: unknown = await migrationFn(currentDbState as unknown);
      if (nextState == null || typeof nextState !== 'object') {
        throw new TypeError(
          `Migration ${migrationIndex} produced invalid ${typeof nextState} state`,
          { cause: nextState },
        );
      }
      await storage.set(nextState as Record<string, unknown>);
      migrationIndex++;
    }

    if (migrationIndex !== version.current) {
      throw new RangeError(`Migration stopped at ${migrationIndex}`, {
        cause: version.migrations,
      });
    }

    return migrationIndex;
  } catch (cause) {
    console.error('Failed to migrate', cause);
    throw new MigrationError(
      `Failed to migrate version ${String(storedVersion)} to ${version.current}`,
      { cause },
    );
  }
};

class MigrationError extends Error {
  constructor(migrationMessage: string, options?: ErrorOptions) {
    const { message, cause } =
      options?.cause instanceof Error
        ? options.cause
        : { message: String(options?.cause), cause: options?.cause };
    super(`${migrationMessage}: ${message}`, { ...options, cause });
    this.name = 'MigrationError';
  }
}
