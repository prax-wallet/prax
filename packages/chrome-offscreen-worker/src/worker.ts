import { OffscreenControl } from './control';
import {
  isOffscreenWorkerEvent,
  isOffscreenWorkerEventMessage,
  type OffscreenWorkerPort,
} from './messages/worker-event';
import type { WorkerConstructorParamsPrimitive } from './messages/root-control';

export class OffscreenWorker implements Worker {
  private static control?: OffscreenControl;

  public static configure(...params: ConstructorParameters<typeof OffscreenControl>) {
    OffscreenWorker.control = new OffscreenControl(...params);
  }

  private params: WorkerConstructorParamsPrimitive;

  private internalTarget: MessagePort & EventTarget;
  private externalTarget: MessagePort & EventTarget;
  private workerPort: Promise<OffscreenWorkerPort>;

  // user-assignable callback properties
  onerror: Worker['onerror'] = null;
  onmessage: Worker['onmessage'] = null;
  onmessageerror: Worker['onmessageerror'] = null;

  constructor(...[scriptURL, options]: ConstructorParameters<typeof Worker>) {
    this.params = [
      String(scriptURL),
      {
        name: `${this.constructor.name} ${Date.now()} ${String(scriptURL)}`,
        ...options,
      },
    ];

    if (!OffscreenWorker.control) {
      throw new Error(
        `${this.constructor.name + '.configure'} must be called before constructing ${this.constructor.name}`,
      );
    }

    this.workerPort = OffscreenWorker.control.constructWorker(...this.params);

    const { port1, port2 } = new MessageChannel();
    this.internalTarget = port1;
    this.externalTarget = port2;

    this.externalTarget.addEventListener(
      'error',
      evt => void this.onerror?.call(this, evt as ErrorEvent),
    );
    this.externalTarget.addEventListener('message', evt => void this.onmessage?.call(this, evt));
    this.externalTarget.addEventListener(
      'messageerror',
      evt => void this.onmessageerror?.call(this, evt),
    );

    void this.workerPort.then(
      port => {
        console.log(this.params[1].name, 'got chromePort');
        port.onMessage.addListener(this.workerListener);

        this.internalTarget.addEventListener('error', this.parentListener);
        this.internalTarget.addEventListener('message', this.parentListener);
        this.internalTarget.addEventListener('messageerror', this.parentListener);

        this.internalTarget.start();
      },
      (error: unknown) => this.internalTarget.dispatchEvent(new ErrorEvent('error', { error })),
    );
  }

  private workerListener = (json: unknown, port: chrome.runtime.Port) => {
    console.debug('worker workerListener', json, port.name);
    if (isOffscreenWorkerEventMessage(json) && isOffscreenWorkerEvent(json.init, json.type)) {
      switch (json.type) {
        case 'error':
          this.externalTarget.dispatchEvent(new ErrorEvent(json.type, { ...json.init }));
          return;
        case 'message':
          this.internalTarget.postMessage(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            new MessageEvent(json.type, { data: (json.init as MessageEventInit).data }),
          );
          return;
        case 'messageerror':
        default:
          //console.warn('Dispatching unknown event', json);
          //this.internalTarget.dispatchEvent(new Event(json.type, json.init));
          throw new Error('Unknown event in worker output', {
            cause: { type: Boolean(json) && json.type, message: json, port: port.name },
          });
      }
    }
  };

  private parentListener = (evt: Event) => {
    console.debug('worker parentListener', [evt]);
    switch (evt.type) {
      case 'error':
        void this.workerPort.then(port =>
          port.postMessage({
            type: 'error',
            init: {
              message: (evt as ErrorEvent).message,
              filename: (evt as ErrorEvent).filename,
              lineno: (evt as ErrorEvent).lineno,
              colno: (evt as ErrorEvent).colno,
              //error: (evt as ErrorEvent).error,
            },
          }),
        );
        break;
      case 'message':
        void this.workerPort.then(port =>
          port.postMessage({
            type: 'message',
            init: { data: (evt as MessageEvent).data as unknown },
          }),
        );
        break;
      case 'messageerror':
        void this.workerPort.then(port =>
          port.postMessage({
            type: 'messageerror',
            init: { data: (evt as MessageEvent).data as unknown },
          }),
        );
        break;
      default:
        throw new Error('Unknown event from parent', { cause: evt });
    }
  };

  terminate: Worker['terminate'] = () => {
    console.warn(this.params[1].name, 'terminate', []);
    void this.workerPort.then(port => port.disconnect());
  };

  postMessage: Worker['postMessage'] = (...args) => {
    console.debug(this.params[1].name, 'postMessage', args);
    // typescript doesn't handle the overloaded signature very well
    const data: unknown = args[0];
    const { transfer } = Array.isArray(args[1]) ? { transfer: args[1] } : { ...args[1] };

    this.externalTarget.postMessage(data, { transfer });
  };

  dispatchEvent: Worker['dispatchEvent'] = event => {
    console.debug(this.params[1].name, 'dispatchEvent', [event]);
    // if this is a novel event type, it will break the listener.
    this.internalTarget.addEventListener(event.type, this.parentListener);

    return this.externalTarget.dispatchEvent(event);
  };

  addEventListener: Worker['addEventListener'] = (
    ...args: Parameters<Worker['addEventListener']>
  ) => {
    console.debug(this.params[1].name, 'addEventListener', args);
    this.externalTarget.addEventListener(...args);
  };

  removeEventListener: Worker['removeEventListener'] = (
    ...args: Parameters<Worker['removeEventListener']>
  ) => {
    console.debug(this.params[1].name, 'removeEventListener', args);
    this.externalTarget.addEventListener(...args);
    this.externalTarget.removeEventListener(...args);
  };
}
