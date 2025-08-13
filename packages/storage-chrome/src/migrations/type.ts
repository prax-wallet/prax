export type ExplicitPartial<T> = {
  [K in keyof Required<T>]: T[K];
};

export interface Migration<
  FromV extends number,
  FromState extends Record<string, unknown> = Record<string, unknown>,
  ToV extends number = number,
  ToState extends Record<string, unknown> = Record<string, unknown>,
> {
  version(iv: FromV): ToV;
  transform(fs: Partial<FromState>): ExplicitPartial<ToState> | Promise<ExplicitPartial<ToState>>;
}
