/* These messages appear only in the single offscreen root control channel. */

export type WorkerConstructorParamsPrimitive =
  Required<ConstructorParameters<typeof Worker>> extends [infer S, infer O]
    ? [S extends string ? S : never, { [k in keyof O]: O[k] & string }]
    : never;

interface OffscreenControlMap {
  'new-Worker': {
    workerId: string;
    init: WorkerConstructorParamsPrimitive;
  };
}

export type OffscreenRootControlType = keyof OffscreenControlMap;

export interface OffscreenRootControl<
  T extends OffscreenRootControlType = OffscreenRootControlType,
> {
  control: T;
  data: OffscreenControlMap[T];
}

export const isOffscreenRootControlMessage = (message: unknown): message is OffscreenRootControl =>
  typeof message === 'object' &&
  message != null &&
  'control' in message &&
  typeof message.control === 'string' &&
  'data' in message &&
  typeof message.data === 'object' &&
  message.data != null &&
  isOffscreenRootControlMessageWithData(message as OffscreenRootControl);

export const isOffscreenRootControlMessageWithData = <T extends OffscreenRootControlType>(message: {
  control: T | string;
  data: NonNullable<object>;
}): message is OffscreenRootControl<T> => {
  const { control, data } = message;
  switch (control) {
    case 'new-Worker':
      return (
        'workerId' in data &&
        typeof data.workerId === 'string' &&
        'init' in data &&
        isOffscreenRootControlNewWorkerInit(data.init)
      );
    default:
      console.warn(
        `Type guard rejected OffscreenRootControl containing ${control} control.`,
        message,
      );
      return false;
  }
};

export const isOffscreenRootControlNewWorkerInit = (
  init?: unknown,
): init is WorkerConstructorParamsPrimitive =>
  Array.isArray(init) &&
  typeof init[0] === 'string' &&
  typeof init[1] === 'object' &&
  isWorkerOptions((init[1] as object | null) ?? {});

export const isWorkerOptions = (opt: NonNullable<object>): opt is WorkerOptions =>
  Object.entries(opt).every(([key, value]) => {
    switch (key as keyof WorkerOptions) {
      case 'credentials':
        return value == null || ['include', 'omit', 'same-origin'].includes(value as string);
      case 'name':
        return value == null || typeof value === 'string';
      case 'type':
        return value == null || ['classic', 'module'].includes(value as string);
      default:
        console.warn(`Type guard rejected WorkerOptions containing ${key} key.`, opt);
        return false;
    }
  });
