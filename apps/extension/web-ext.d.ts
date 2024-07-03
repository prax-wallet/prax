declare module 'web-ext' {
  export interface WebExtRunner {
    run(): Promise<void>;
    reloadAllExtensions(): Promise<unknown[]>;
    registerCleanup(fn: () => void): void;
    exit(): Promise<void>;
  }

  export const cmd: {
    run: (opt: {
      target: 'firefox-desktop' | 'firefox-android' | 'chromium';
      sourceDir?: string | string[];
      startUrl?: string | string[];
      keepProfileChanges?: boolean;
      profileCreateIfMissing?: boolean;
      chromiumProfile?: string;
    }) => Promise<WebExtRunner>;
  };
}
