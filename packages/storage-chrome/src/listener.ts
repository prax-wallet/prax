export type ChromeStorageListener<S = Record<string, unknown>> = (changes: {
  [K in keyof S]?: { newValue?: S[K]; oldValue?: S[K] };
}) => void;
