This directory contains types describing the present and historic versions of
Prax local extension storage.

Files in this directory should not import anything. Imported items may change,
thus changing the storage schema without a direct edit.

Each file should have a single group export representing types for the local
area format, the sync area format, and the version number:

```ts
export { type LOCAL, type SYNC, type VERSION };
```

Area schema should not be written as an `interface` due to some minor details of
typescript. Specifically, each type will be used as a type parameter that must
be able to meet the constraint `Record<string, unknown>`.

These rules are enforced with eslint configuration.
