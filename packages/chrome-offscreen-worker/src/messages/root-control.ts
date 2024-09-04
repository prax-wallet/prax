/* These messages appear only in the single offscreen root control channel. */

export type WorkerConstructorParamsPrimitive =
  Required<ConstructorParameters<typeof Worker>> extends [infer S, infer O]
    ? [S extends string ? S : never, { [k in keyof O]: O[k] & string }]
    : never;

interface OffscreenControlMap {
  new: {
    workerId: string;
    init: WorkerConstructorParamsPrimitive;
  };
}

export type OffscreenRootControlType = keyof OffscreenControlMap;

export interface OffscreenRootControl<
  T extends OffscreenRootControlType = OffscreenRootControlType,
> {
  type: T;
  control: OffscreenControlMap[T];
}

export interface OffscreenRootPort extends chrome.runtime.Port {
  postMessage<T extends OffscreenRootControlType>(message: OffscreenRootControl<T>): void;
}

export const isOffscreenRootControlMessage = (message: unknown): message is OffscreenRootControl =>
  typeof message === 'object' &&
  message != null &&
  'type' in message &&
  typeof message.type === 'string' &&
  'control' in message &&
  typeof message.control === 'object' &&
  message.control != null &&
  isOffscreenRootControl(message.control, message.type);

export const isOffscreenRootControl = <T extends OffscreenRootControlType>(
  control: unknown,
  controlType: T | string,
): control is OffscreenRootControl<T>['control'] => {
  switch (controlType as T) {
    case 'new':
      return (
        typeof control === 'object' &&
        control != null &&
        'workerId' in control &&
        typeof control.workerId === 'string' &&
        'init' in control &&
        Array.isArray(control.init) &&
        typeof control.init[0] === 'string' &&
        (control.init[1] == null || typeof control.init[1] === 'object')
      );
  }

  return false;
};
