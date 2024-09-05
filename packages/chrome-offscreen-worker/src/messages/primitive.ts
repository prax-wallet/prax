export type WorkerConstructorParamsPrimitive =
  Required<ConstructorParameters<typeof Worker>> extends [infer S, infer O]
    ? [S extends string ? S : never, { [k in keyof O]: O[k] & string }]
    : never;

export type ErrorEventInitPrimitive = Pick<
  ErrorEventInit,
  'colno' | 'filename' | 'lineno' | 'message'
> & { error?: JsonObject };

export type MessageEventInitPrimitive = Pick<MessageEventInit<JsonObject>, 'data'>;

export const isMessageEventInitPrimitive = (i: object): i is MessageEventInitPrimitive =>
  'data' in i && isJsonObject(i.data);

export const isErrorEventInitPrimitive = (i: object): i is ErrorEventInitPrimitive => {
  const { message, filename, lineno, colno, error } = { ...i } as Record<string, unknown>;
  return (
    (message == null || typeof message === 'string') &&
    (filename == null || typeof filename === 'string') &&
    (lineno == null || typeof lineno === 'number') &&
    (colno == null || typeof colno === 'number') &&
    (error == null || isJsonObject(error))
  );
};

type JsonPrimitive = number | string | boolean | null;
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/consistent-indexed-object-style
type JsonObject = { [k: string]: JsonValue };
type JsonArray = JsonValue[];
type JsonValue = JsonPrimitive | JsonObject | JsonArray;

const isJsonPrimitive = (value: unknown): value is JsonPrimitive =>
  value == null || ['number', 'string', 'boolean'].includes(typeof value);

const isJsonArray = (value: unknown): value is JsonValue[] =>
  Array.isArray(value) && value.every(isJsonValue);

const isJsonValue = (value: unknown): value is JsonValue =>
  isJsonPrimitive(value) || isJsonObject(value) || isJsonArray(value);

const isJsonObject = (obj: unknown): obj is JsonObject =>
  obj != null &&
  typeof obj === 'object' &&
  !Array.isArray(obj) &&
  Object.entries(obj).every(([key, value]) => typeof key === 'string' && isJsonValue(value));
