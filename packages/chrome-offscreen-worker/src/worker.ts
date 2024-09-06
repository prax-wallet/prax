import { OffscreenController } from './controller';
import type { WorkerConstructorParamsPrimitive } from './messages/primitive';
import { isWorkerEvent, validWorkerEventInit, WorkerEvent } from './messages/worker-event';

export class OffscreenWorker extends EventTarget implements Worker {
  private static control?: OffscreenController;

  public static configure(...params: ConstructorParameters<typeof OffscreenController>) {
    OffscreenWorker.control = new OffscreenController(...params);
  }

  private params: WorkerConstructorParamsPrimitive;

  private worker: Promise<chrome.runtime.Port>;

  // user-assignable callback properties
  onerror: Worker['onerror'] = null;
  onmessage: Worker['onmessage'] = null;
  onmessageerror: Worker['onmessageerror'] = null;

  constructor(...[scriptURL, options]: ConstructorParameters<typeof Worker>) {
    if (!OffscreenWorker.control) {
      throw new Error(
        'The static configure method must be called before constructing an instance of this class.',
      );
    }

    console.log('offscreen worker super');
    super();

    this.params = [
      String(scriptURL),
      { name: `${this.constructor.name} ${Date.now()} ${String(scriptURL)}`, ...options },
    ];

    console.log('calling offscreen worker construct', this.params[1].name);
    this.worker = OffscreenWorker.control.constructWorker(...this.params);

    void this.worker
      .then(
        workerPort => {
          console.log('got worker port', this.params[1].name);
          workerPort.onMessage.addListener((...params) => {
            console.log('activated worker output listener in background', ...params);
            this.workerDispatch(...params);
          });
        },
        (error: unknown) => {
          this.dispatchEvent(new ErrorEvent('error', { error }));
          throw new Error('Failed to attach worker port', { cause: error });
        },
      )
      .finally(() => {
        console.log('worker promise settled', this.params[1].name, this.worker);
      });

    console.log('exit constructor');
  }

  private workerDispatch = (...[json]: [unknown, chrome.runtime.Port]) => {
    console.debug('worker output', json);
    if (isWorkerEvent(json)) {
      const [event, init] = json;
      switch (event) {
        case 'error': {
          const { colno, filename, lineno, message } = validWorkerEventInit(event, init);
          const dispatch = new ErrorEvent(event, { colno, filename, lineno, message });
          this.dispatchEvent(dispatch);
          this.onerror?.(dispatch);
          break;
        }
        case 'message':
        case 'messageerror': {
          const { data } = validWorkerEventInit(event, init);
          const dispatch = new MessageEvent(event, { data });
          this.dispatchEvent(dispatch);
          this[`on${event}`]?.(dispatch);
          break;
        }
        default:
          throw new Error('Unknown event from worker', { cause: json });
      }
    }
  };

  private callerDispatch = (evt: Event) => {
    console.debug('worker callerInputListener', evt.type);
    switch (evt.type) {
      case 'message': {
        const { data } = evt as MessageEvent<unknown>;
        const workerEventMessage: WorkerEvent<'message'> = ['message', { data }];
        void this.worker.then(port => port.postMessage(workerEventMessage));
        return;
      }
      case 'error':
      case 'messageerror':
        throw new Error('Unexpected event from caller', { cause: evt });
      default:
        throw new Error('Unknown event from caller', { cause: evt });
    }
  };

  terminate: Worker['terminate'] = () => {
    console.warn('worker terminate', this.params[1].name);
    void this.worker.then(port => port.disconnect());
    this.postMessage = () => void 0;
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

    this.callerDispatch(messageEvent);
  };
}
