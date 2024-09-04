/* These messages appear only in the individual offscreen worker control channels. */

type OffscreenWorkerEventType = keyof WorkerEventMap;

interface OffscreenWorkerEventInitMap {
  error: ErrorEventInit;
  message: MessageEventInit;
  messageerror: MessageEventInit;
}

export interface OffscreenWorkerEvent<
  T extends OffscreenWorkerEventType = OffscreenWorkerEventType,
> {
  type: T;
  init: OffscreenWorkerEventInitMap[T];
}

export interface OffscreenWorkerPort extends chrome.runtime.Port {
  postMessage<T extends OffscreenWorkerEventType>(message: OffscreenWorkerEvent<T>): void;
}

export const isOffscreenWorkerEventMessage = (message: unknown): message is OffscreenWorkerEvent =>
  typeof message === 'object' &&
  message != null &&
  'type' in message &&
  typeof message.type === 'string' &&
  'event' in message &&
  typeof message.event === 'object' &&
  message.event != null;

export const isOffscreenWorkerEvent = <T extends OffscreenWorkerEventType>(
  init: unknown,
  eventType: T | string,
): init is OffscreenWorkerEvent<T>['init'] => {
  switch (eventType as T) {
    case 'error':
      return (
        typeof init === 'object' &&
        init != null &&
        'message' in init &&
        (typeof init.message === 'string' || init.message == null) &&
        'filename' in init &&
        (typeof init.filename === 'string' || init.filename == null) &&
        'lineno' in init &&
        (typeof init.lineno === 'number' || init.lineno == null) &&
        'colno' in init &&
        (typeof init.colno === 'number' || init.colno == null)
      );
    case 'message':
    case 'messageerror':
      return typeof init === 'object' && init != null && 'data' in init && init.data != null;
  }

  return false;
};
