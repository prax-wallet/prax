import type { StorageVersion } from './numbers';

export interface PraxStorage<V extends StorageVersion> {
  local: {
    0: import('./v0').local;
    1: import('./v1').local;
  }[V];
  sync: {
    0: never;
    1: never;
  }[V];
  session: {
    0: never;
    1: import('./v1').session;
  }[V];
}
