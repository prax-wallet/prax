import { OffscreenControl } from './control';
import {
  isOffscreenWorkerEvent,
  isOffscreenWorkerEventMessage,
  type OffscreenWorkerPort,
} from './messages/worker-event';
import type { WorkerConstructorParamsPrimitive } from './messages/root-control';

type ErrorEventInitUnknown = Omit<ErrorEventInit, 'error'> & { error?: unknown };
type MessageEventInitUnknown = Omit<MessageEventInit, 'data'> & { data?: unknown };

export class OffscreenWorker implements Worker {
  private static control?: OffscreenControl;

  public static configure(...params: ConstructorParameters<typeof OffscreenControl>) {
    OffscreenWorker.control = new OffscreenControl(...params);
  }

  private params: WorkerConstructorParamsPrimitive;

  private outgoing = new EventTarget();
  private incoming = new EventTarget();
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

    this.outgoing.addEventListener(
      'error',
      evt => void this.onerror?.call(this, evt as ErrorEvent),
    );
    this.outgoing.addEventListener(
      'message',
      evt => void this.onmessage?.call(this, evt as MessageEvent),
    );
    this.outgoing.addEventListener(
      'messageerror',
      evt => void this.onmessageerror?.call(this, evt as MessageEvent),
    );

    void this.workerPort.then(
      port => {
        console.log(this.params[1].name, 'got chromePort');
        port.onMessage.addListener(this.workerOutputListener);

        this.incoming.addEventListener('error', this.callerInputListener);
        this.incoming.addEventListener('message', this.callerInputListener);
        this.incoming.addEventListener('messageerror', this.callerInputListener);
      },
      (error: unknown) => {
        this.outgoing.dispatchEvent(new ErrorEvent('error', { error }));
        throw new Error('Failed to attach worker port', { cause: error });
      },
    );
  }

  private workerOutputListener = (json: unknown) => {
    console.debug('worker workerOutputListener', json);
    if (isOffscreenWorkerEventMessage(json) && isOffscreenWorkerEvent(json.init, json.event)) {
      switch (json.event) {
        case 'error': {
          const { colno, error, filename, lineno, message } = json.init as ErrorEventInitUnknown;
          this.outgoing.dispatchEvent(
            new ErrorEvent(json.event, { colno, error, filename, lineno, message }),
          );
          return;
        }
        case 'message':
        case 'messageerror': {
          const { data } = json.init as { data: unknown };
          this.outgoing.dispatchEvent(new MessageEvent(json.event, { data }));
          return;
        }
        default:
          console.warn('Dispatching unknown event from worker', json.event, json);
          this.outgoing.dispatchEvent(new Event(json.event, json.init));
          throw new Error('Unknown event from worker', { cause: json });
      }
    }
  };

  private callerInputListener = (evt: Event) => {
    console.debug('worker callerInputListener', [evt]);
    switch (evt.type) {
      case 'error': {
        const { message, filename, lineno, colno, error } = evt as ErrorEventInitUnknown;
        void this.workerPort.then(port =>
          port.postMessage({ event: 'error', init: { message, filename, lineno, colno, error } }),
        );
        return;
      }
      case 'message': {
        const { data } = evt as MessageEventInitUnknown;
        void this.workerPort.then(port => port.postMessage({ event: 'message', init: { data } }));
        return;
      }
      case 'messageerror': {
        const { data } = evt as MessageEventInitUnknown;
        void this.workerPort.then(port =>
          port.postMessage({ event: 'messageerror', init: { data } }),
        );
        return;
      }
      default:
        throw new Error('Unknown event from caller', { cause: evt });
    }
  };

  terminate: Worker['terminate'] = () => {
    console.warn('worker terminate', this.params[1].name);
    void this.workerPort.then(port => port.disconnect());
  };

  postMessage: Worker['postMessage'] = (...args) => {
    console.debug('worker postMessage', this.params[1].name, args);
    // typescript doesn't handle the overloaded signature very well
    const data: unknown = args[0];

    const { transfer } = Array.isArray(args[1]) ? { transfer: args[1] } : { ...args[1] };
    if (transfer?.length) {
      throw new Error('Transferable unimplemented', { cause: args });
    }

    const messageEvent = new MessageEvent('message', { data });

    this.incoming.dispatchEvent(messageEvent);
  };

  dispatchEvent: Worker['dispatchEvent'] = event => {
    console.debug('worker dispatchEvent', this.params[1].name, [event]);
    return this.incoming.dispatchEvent(event);
  };

  addEventListener: Worker['addEventListener'] = (
    ...args: Parameters<Worker['addEventListener']>
  ) => {
    console.debug('worker addEventListener', this.params[1].name, args);
    this.outgoing.addEventListener(...args);
  };

  removeEventListener: Worker['removeEventListener'] = (
    ...args: Parameters<Worker['removeEventListener']>
  ) => {
    console.debug('worker removeEventListener', this.params[1].name, args);
    this.outgoing.removeEventListener(...args);
  };
}
