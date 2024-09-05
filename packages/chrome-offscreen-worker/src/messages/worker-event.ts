/* These messages appear only in the individual offscreen worker control channels. */

import { isErrorEventInitPrimitive, isMessageEventInitPrimitive } from './primitive';

interface WorkerEventInitMap extends Required<Record<WorkerEventType, EventInit>> {
  error: ErrorEventInit;
  message: MessageEventInit<unknown>;
  messageerror: MessageEventInit<unknown>;
}

export type WorkerEventType = keyof WorkerEventMap;

export interface WorkerEvent<T extends string = WorkerEventType> {
  event: T;
  init: T extends WorkerEventType ? WorkerEventInitMap[T] : unknown;
}

export const isWorkerEvent = (message: unknown): message is WorkerEvent =>
  typeof message === 'object' &&
  message != null &&
  'event' in message &&
  typeof message.event === 'string' &&
  'init' in message &&
  typeof message.init === 'object' &&
  message.init != null;

export const hasValidWorkerEventInit = <T extends WorkerEventType>(message: {
  event: string | T;
  init: unknown;
}): message is WorkerEvent<T> => {
  if (typeof message.init !== 'object' || message.init == null) {
    return false;
  }

  const { event, init } = message;
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
  type: T,
  message: WorkerEvent<string>,
): WorkerEvent<T>['init'] => {
  if (message.event !== type || !hasValidWorkerEventInit<T>(message)) {
    throw new TypeError('invalid WorkerEvent');
  }
  return message.init;
};
