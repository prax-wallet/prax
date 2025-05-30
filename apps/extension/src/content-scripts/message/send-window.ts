import { isPraxMessageEvent, type PraxMessageEvent } from './prax-message-event';

/** @note not private. could be observed by anything in this window. */
export const sendWindow = <P = never>(contents: NoInfer<P>) =>
  window.postMessage(
    { [PRAX]: contents } satisfies Record<typeof PRAX, P>,
    '/', // restrict to the same origin
    contents instanceof MessagePort ? [contents] : [],
  );

/** @note not private. could be activated by anything in this window. */
export const listenWindow = (
  signal: AbortSignal | undefined,
  listener: (pev: PraxMessageEvent) => void,
) =>
  window.addEventListener(
    'message',
    ev => {
      if (
        isPraxMessageEvent(ev) && // only handle prax messages
        ev.origin === window.origin && // from this origin
        ev.source === window // from this window
      ) {
        listener(ev);
      }
    },
    { signal },
  );
