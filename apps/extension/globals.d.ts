declare global {
  /**
   * Speculation Rules API is available in chrome.  Other browsers don't support
   * this yet, so it's not in typescript's DOM lib.
   *
   * We use the `Document.prerendering` attribute. We also use the
   * `prerenderingchange` event, but that doesn't need typing.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/prerendering
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/prerenderingchange_event
   */
  interface Document {
    readonly prerendering?: boolean;
  }

  /**
   * Navigation API is available in chrome.  Other browsers don't support this
   * yet, so it's not in typescript's DOM lib.
   *
   * We use the `navigate` event.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigation
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigation/navigate_event
   */
  interface Window {
    readonly navigation: EventTarget;
  }

  /**
   * The Web Locks API is standard, but `LockManager.request` is typed
   * incorrectly by IDL.  This corrected type is from `typescript@8c62e08` which
   * is not yet in a release.
   *
   * @todo remove when `typescript@>5.8.3`
   * @see https://developer.mozilla.org/en-US/docs/Web/API/LockManager/request
   * @see https://w3c.github.io/web-locks/#api-lock-manager-request
   * @see https://github.com/microsoft/TypeScript/blob/81c951894e93bdc37c6916f18adcd80de76679bc/src/lib/dom.generated.d.ts#L16225-L16237
   * @see https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1947
   */
  interface LockManager {
    request<T>(name: string, callback: (lock: Lock | null) => T): Promise<T>;
    request<T>(name: string, options: LockOptions, callback: (lock: Lock | null) => T): Promise<T>;
  }
}

export {};
