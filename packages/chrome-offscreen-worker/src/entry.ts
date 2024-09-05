import { isOffscreenRootControlMessage, OffscreenRootControl } from './messages/root-control';
import {
  isOffscreenWorkerEvent,
  isOffscreenWorkerEventMessage,
  type OffscreenWorkerPort,
} from './messages/worker-event';

let unalive = setTimeout(() => window.close(), 60_000);

const contemplate = (reason?: string) => {
  console.log('offscreen contemplating', reason);
  unalive = setTimeout(() => window.close(), 60_000);
};

const persist = () => {
  console.log('offscreen persisting');
  clearTimeout(unalive);
};

const sessionId = location.hash.slice(1);

chrome.runtime.onConnect.addListener(newSessionPort => {
  console.log(
    'offscreen entry onConnect with hash',
    location.hash,
    'handling port',
    newSessionPort.name,
  );
  if (newSessionPort.name === sessionId) {
    console.log('offscreen accepting session', sessionId);
    persist();
    attachSession(newSessionPort);
  }
});

const attachSession = (sessionPort: chrome.runtime.Port) => {
  console.log('attachSession', sessionPort.name);
  const workers = new Map<string, { worker: Worker; workerPort: chrome.runtime.Port }>();

  const constructWorker = ({ workerId, init }: OffscreenRootControl<'new'>['control']) => {
    persist();
    console.log('constructWorker', workerId, ...init);
    const [workerUrl, workerOptions] = init;
    const worker = new Worker(workerUrl, {
      ...workerOptions,
      name: workerOptions.name ?? workerId,
    });
    const workerPort = chrome.runtime.connect({ name: workerId }) as OffscreenWorkerPort;

    // setup disconnect handler
    workerPort.onDisconnect.addListener(() => {
      console.log('workerPort onDisconnect', workerId);
      workers.delete(workerId);
      if (!workers.size) {
        contemplate('no workers');
      }
      worker.terminate();
    });

    // track worker
    workers.set(workerId, { worker, workerPort });

    const workerListener = (json: unknown) => {
      console.log('workerListener', json, workerId);
      if (isOffscreenWorkerEventMessage(json)) {
        if (isOffscreenWorkerEvent(json.init, json.type)) {
          persist();
          switch (json.type) {
            case 'error':
              worker.dispatchEvent(new ErrorEvent(json.type, json.init));
              return;
            case 'message':
            case 'messageerror':
              worker.dispatchEvent(new MessageEvent(json.type, json.init));
              return;
            default:
              throw new Error('Unknown message in worker input', {
                cause: { message: json, workerId },
              });
          }
        }
      }
    };

    // begin event dispatch
    workerPort.onMessage.addListener(workerListener);
  };

  sessionPort.onMessage.addListener((json: unknown) => {
    console.log('offscreen control message', json, sessionId);
    if (isOffscreenRootControlMessage(json)) {
      switch (json.type) {
        case 'new': {
          constructWorker(json.control);
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
