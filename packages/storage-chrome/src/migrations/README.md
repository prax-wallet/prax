This directory contains migration functions that transform historic versions of
Prax local extension storage to an intermediate version, or the current version.

Files in this directory have restricted imports. Only specific modules are
allowed, to prevent migration behavior from changing unexpectedly.

Every migration should at minimum import something like:

```ts
import type FROM from '../versions/local-v12';
import type TO from '../versions/local-v13';
import { assertVersion, type Migration } from './util';
```

And export something like:

```ts
export default { version, migrate } satisfies MIGRATION;
```

Further allowed imports include:

- `@penumbra-zone/protobuf` for protobuf message types, which should not have breaking changes
- `@penumbra-zone/bech32m` for bech32m encode/decode utilities based on message types
- `lodash` for utility functions

Each migration file should contain a single default function export to perform
the migration.

These rules are enforced with eslint configuration.

For consistency, please define locally:

```ts
const FROM_VERSION = 12;
const TO_VERSION = 13;
type MIGRATION = Migration<typeof FROM_VERSION, FROM, typeof TO_VERSION, TO>;
```
