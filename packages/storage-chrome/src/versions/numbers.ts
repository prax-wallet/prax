export type StorageVersion = 0 | 1;
export const CURRENT_VERSION = 1;
export type HistoricVersion = Exclude<StorageVersion, typeof CURRENT_VERSION>;
export type AnotherVersion<V extends StorageVersion> = Exclude<StorageVersion, V>;
