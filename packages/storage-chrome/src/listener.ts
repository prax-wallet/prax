export type ChromeStorageListener<S = never> = (changes: {
  [k in keyof S]?: { newValue?: S[k]; oldValue?: S[k] };
}) => void;
