/* These messages appear only in the individual offscreen worker control channels. */

type OffscreenWorkerEventType = keyof WorkerEventMap;

interface OffscreenWorkerEventInitMap {
  error: ErrorEventInit;
  message: MessageEventInit<unknown>;
  messageerror: MessageEventInit<unknown>;
}

export interface OffscreenWorkerEvent<
  T extends OffscreenWorkerEventType = OffscreenWorkerEventType,
> {
  event: T;
  init: OffscreenWorkerEventInitMap[T];
}

export const isOffscreenWorkerEventMessage = (message: unknown): message is OffscreenWorkerEvent =>
  typeof message === 'object' &&
  message != null &&
  'event' in message &&
  typeof message.event === 'string' &&
  'init' in message &&
  typeof message.init === 'object' &&
  message.init != null &&
  isOffscreenWorkerEventInit(message);

export const isOffscreenWorkerEventInit = <T extends OffscreenWorkerEventType>(
  message: OffscreenWorkerEvent | { event: string; init: NonNullable<object> },
): message is OffscreenWorkerEvent<T> => {
  const { event, init } = message;
  switch (event) {
    case 'error':
      return (
        'message' in init &&
        (init.message == null || typeof init.message === 'string') &&
        'filename' in init &&
        (typeof init.filename === 'string' || init.filename == null) &&
        'lineno' in init &&
        (typeof init.lineno === 'number' || init.lineno == null) &&
        'colno' in init &&
        (typeof init.colno === 'number' || init.colno == null)
      );
    case 'message':
    case 'messageerror':
      return typeof init === 'object' && 'data' in init && init.data != null;
  }

  return false;
};
