import { isOffscreenRootControlMessage, OffscreenRootControl } from './messages/root-control';
import {
  isOffscreenWorkerEvent,
  isOffscreenWorkerEventMessage,
  type OffscreenWorkerPort,
} from './messages/worker-event';

const sessions = new Map<string, chrome.runtime.Port>();

let unalive = setTimeout(() => window.close(), 60_000);

const contemplate = (reason?: string) => {
  console.log('offscreen contemplating', reason);
  unalive = setTimeout(() => window.close(), 60_000);
};

const persist = () => {
  console.log('offscreen persisting');
  clearTimeout(unalive);
};

console.log('offscreen entry at init with hash', location.hash);

chrome.runtime.onConnect.addListener(newSessionPort => {
  console.log(
    'offscreen entry onConnect with hash',
    location.hash,
    'handling port',
    newSessionPort.name,
  );
  const sessionId = location.hash;
  if (newSessionPort.name === sessionId) {
    console.log('offscreen accepting session', sessionId);
    persist();
    sessions.set(sessionId, newSessionPort);
    attachSession(newSessionPort);

    newSessionPort.onDisconnect.addListener(() => {
      console.log('port onDisconnect', sessionId);
      sessions.delete(sessionId);
      if (!sessions.size) {
        contemplate();
      }
    });

    location.hash = crypto.randomUUID();
  }
});

const attachSession = (sessionPort: chrome.runtime.Port) => {
  console.log('attachSession', sessionPort.name);
  //const sessionId = port.name;
  const workers = new Map<string, { worker: Worker; workerPort: chrome.runtime.Port }>();

  const constructWorker = ({ workerId, init }: OffscreenRootControl<'new'>['control']) => {
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
      worker.terminate();
    });

    // track worker
    workers.set(workerId, { worker, workerPort });

    const workerListener = (json: unknown, _p: chrome.runtime.Port) => {
      console.log('workerListener', json, _p.name);
      if (isOffscreenWorkerEventMessage(json)) {
        if (isOffscreenWorkerEvent(json.init, json.type)) {
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
                cause: { message: json, port: _p.name },
              });
          }
        }
      }
    };

    // begin event dispatch
    workerPort.onMessage.addListener(workerListener);
  };

  sessionPort.onMessage.addListener((json: unknown, _p: chrome.runtime.Port) => {
    console.log('offscreen control message', json, _p.name);
    if (isOffscreenRootControlMessage(json)) {
      switch (json.type) {
        case 'new': {
          constructWorker(json.control);
          return;
        }
        default:
          throw new Error('Unknown message in offscreen control', {
            cause: { message: json, port: _p.name },
          });
      }
    }
  });

  sessionPort.onDisconnect.addListener(() => {
    workers.forEach(({ worker, workerPort }) => {
      worker.terminate();
      workerPort.disconnect();
    });
  });
};
