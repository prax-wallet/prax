import { isPraxMessageEvent, type PraxMessageEvent } from './prax-message-event';

/** @note not private. could be observed by anything in this window. */
export const sendWindow = <P = never>(contents: NoInfer<P>) => {
  if (globalThis.__DEV__) {
    console.trace('sendWindow', contents);
  }

  window.postMessage(
    { [PRAX]: contents } satisfies Record<typeof PRAX, P>,
    '/', // restrict to the same origin
    contents instanceof MessagePort ? [contents] : [],
  );
};

/** @note not private. could be activated by anything in this window. */
export const listenWindow = (
  signal: AbortSignal | undefined,
  listener: (pev: PraxMessageEvent) => boolean,
) => {
  if (globalThis.__DEV__) {
    console.trace('listenWindow attaching', listener.name);
  }

  window.addEventListener(
    'message',
    ev => {
      if (
        isPraxMessageEvent(ev) && // only handle prax messages
        ev.origin === window.origin && // from this origin
        ev.source === window // from this window
      ) {
        const handled = listener(ev);
        if (handled && globalThis.__DEV__) {
          console.debug('listenWindow', listener.name, ev.data[PRAX]);
        }
      }
    },
    { signal },
  );
};
