/* These messages appear only in the individual offscreen worker control channels. */

import { isErrorEventInitPrimitive, isMessageEventInitPrimitive } from './primitive';

interface WorkerEventInitMap extends Required<Record<WorkerEventType, EventInit>> {
  error: ErrorEventInit;
  message: MessageEventInit<unknown>;
  messageerror: MessageEventInit<unknown>;
}

export type WorkerEventType = keyof WorkerEventMap;

export type WorkerEvent<T extends string = WorkerEventType> = [
  T,
  T extends WorkerEventType ? WorkerEventInitMap[T] : unknown,
];

export const isWorkerEvent = (message: unknown): message is WorkerEvent => {
  if (Array.isArray(message) && message.length === 2) {
    const [event, init] = message as [unknown, unknown];
    return typeof event === 'string' && typeof init === 'object' && init != null;
  }
  return false;
};

export const hasValidWorkerEventInit = <T extends WorkerEventType>(
  params: WorkerEvent<T | string>,
): params is WorkerEvent<T> => {
  const [event, init] = params;
  if (typeof init !== 'object' || init == null) {
    return false;
  }
  switch (event) {
    case 'error':
      return isErrorEventInitPrimitive(init);
    case 'message':
    case 'messageerror':
      return isMessageEventInitPrimitive(init);
    default:
      return false;
  }
};

export const validWorkerEventInit = <T extends WorkerEventType>(
  event: T,
  init: unknown,
): WorkerEvent<T>[1] => {
  const message = [event, init] satisfies WorkerEvent<string>;
  if (!hasValidWorkerEventInit<T>(message)) {
    throw new TypeError('invalid WorkerEvent');
  }
  return message[1];
};
