This directory contains migration functions that transform historic versions of
Prax local extension storage to an intermediate version, or the current version.

Files in this directory have restricted imports. Only specific modules are
allowed, to prevent migration behavior from changing unexpectedly. Production
dependencies from `package.json` are allowed import.

Each migration file should contain a single default export, containing functions
named `version` and `transform` to perform the migration.

Every migration should at minimum import something like:

```ts
import * as TO from '../versions/v13';
import * as FROM from '../versions/v12';
import { expectVersion, type Migration } from './util';
```

And export something like:

```ts
type MIGRATION = Migration<FROM.VERSION, FROM.LOCAL, TO.VERSION, TO.LOCAL>;
export default { version, transform } satisfies MIGRATION;
```

These rules are enforced with eslint configuration.
