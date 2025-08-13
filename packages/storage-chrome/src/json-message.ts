/* eslint-disable @typescript-eslint/no-unsafe-function-type -- necessary */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- necessary */
import type { Message } from '@bufbuild/protobuf';

/** Use this instead of explicitly detailing the structure of a protobuf message. */
export type JsonMessage<T> = {
  [P in keyof T as T[P] extends Function ? never : P]: JsonField<T[P]>;
};

type JsonField<F> =
  F extends Message<infer M>
    ? JsonMessage<M>
    : F extends bigint | Date | Uint8Array
      ? string
      : F extends boolean | string | number | null
        ? F
        : F extends (infer U)[]
          ? JsonField<U>[]
          : F extends { case: infer C extends string; value: infer V extends Message<V> }
            ? { [c in C]: JsonMessage<V> }
            : F extends {
                  case: infer UC extends string | undefined;
                  value?: infer UV extends unknown;
                }
              ? { [c in UC extends string ? UC : never]: JsonField<UV> }
              : F extends { [k: string | number]: Message<infer U> }
                ? { [k in string | number]: JsonMessage<U> }
                : F;
