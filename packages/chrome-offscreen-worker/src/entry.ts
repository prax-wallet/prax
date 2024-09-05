import { isOffscreenRootControlMessage, OffscreenRootControl } from './messages/root-control';
import {
  isOffscreenWorkerEvent,
  isOffscreenWorkerEventMessage,
  OffscreenWorkerEvent,
  type OffscreenWorkerPort,
} from './messages/worker-event';
import { toErrorEventInit, toMessageEventInit } from './to-init';

declare global {
  // eslint-disable-next-line no-var
  var __DEV__: boolean | undefined;
}

let unalive = setTimeout(() => window.close(), 60_000);

const contemplate = (...reason: unknown[]) => {
  if (globalThis.__DEV__) {
    console.log('offscreen contemplating', ...reason);
  }
  unalive = setTimeout(() => window.close(), 60_000);
};

const persist = (...reason: unknown[]) => {
  if (globalThis.__DEV__) {
    console.log('offscreen persisting', ...reason);
  }
  clearTimeout(unalive);
};

const sessionId = location.hash.slice(1);

chrome.runtime.onConnect.addListener(newSessionPort => {
  if (newSessionPort.name === sessionId) {
    persist('new session', sessionId);
    attachSession(newSessionPort);
  }
});

const attachSession = (sessionPort: chrome.runtime.Port) => {
  console.log('attachSession', sessionPort.name);
  const workers = new Map<string, { worker: Worker; workerPort: chrome.runtime.Port }>();

  const constructWorker = ({ workerId, init }: OffscreenRootControl<'new'>['data']) => {
    persist();
    console.log('constructWorker', workerId, ...init);
    const [workerUrl, workerOptions] = init;
    const worker = new Worker(workerUrl, {
      ...workerOptions,
      name: workerOptions.name ?? workerId,
    });
    const incoming = chrome.runtime.connect({ name: workerId }) as OffscreenWorkerPort;

    worker.addEventListener('error', event =>
      incoming.postMessage({ event: 'error', init: toErrorEventInit(event) }),
    );
    worker.addEventListener('messageerror', event =>
      incoming.postMessage({ event: 'messageerror', init: toMessageEventInit(event) }),
    );
    worker.addEventListener('message', event =>
      incoming.postMessage({ event: 'message', init: toMessageEventInit(event) }),
    );

    // setup disconnect handler
    incoming.onDisconnect.addListener(() => {
      console.log('entry workerPort onDisconnect', workerId);
      workers.delete(workerId);
      if (!workers.size) {
        contemplate('no workers');
      }
      worker.terminate();
    });

    // track worker
    workers.set(workerId, { worker, workerPort: incoming });

    const workerListener = (json: unknown) => {
      console.log('entry workerListener', json, workerId);
      if (isOffscreenWorkerEventMessage(json)) {
        switch (json.event) {
          case 'error': {
            const init = validateEventInitJson(json.init, 'error');
            // TODO: does this activate callbacks inside the worker, or on this side?
            worker.dispatchEvent(new ErrorEvent('error', init));
            return;
          }
          case 'messageerror': {
            const init = validateEventInitJson(json.init, 'messageerror');
            throw new Error('Worker messageerror', { cause: init.data });
          }
          case 'message': {
            const init = validateEventInitJson(json.init, 'message');
            worker.postMessage(init.data);
            return;
          }
          default:
            throw new Error('Unknown message in worker input', {
              cause: { message: json, workerId },
            });
        }
      }
    };

    // begin event dispatch
    incoming.onMessage.addListener(workerListener);
  };

  sessionPort.onMessage.addListener((json: unknown) => {
    console.log('entry control', json, sessionId);
    if (isOffscreenRootControlMessage(json)) {
      switch (json.control) {
        case 'new': {
          constructWorker(json.data);
          return;
        }
        default:
          throw new Error('Unknown message in offscreen control', {
            cause: { message: json },
          });
      }
    }
  });

  sessionPort.onDisconnect.addListener(() => {
    contemplate('session disconnect');
    workers.forEach(({ worker, workerPort }) => {
      worker.terminate();
      workerPort.disconnect();
    });
  });
};

const validateEventInitJson = <T extends keyof WorkerEventMap>(
  init: unknown,
  type: T,
): OffscreenWorkerEvent<T>['init'] => {
  if (!isOffscreenWorkerEvent(init, type)) {
    throw new Error('Invalid event init', { cause: { init, type } });
  }
  return init;
};
