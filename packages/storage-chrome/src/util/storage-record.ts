export type StorageValue =
  | undefined
  | string
  | number
  | boolean
  | null
  | StorageValue[]
  | StorageRecord;

export type StorageRecord<R = unknown> = {
  [key in keyof R & string]: R[key] extends StorageValue ? R[key] : never;
};
