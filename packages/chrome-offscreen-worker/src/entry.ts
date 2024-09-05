import { isOffscreenControl, validOffscreenControlData } from './messages/offscreen-control';
import { isWorkerEvent, validWorkerEventInit } from './messages/worker-event';
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

const constructWorker = ({
  workerId,
  init,
}: {
  workerId: string;
  init: Required<ConstructorParameters<typeof Worker>>;
}) => {
  persist();
  console.log('constructWorker', workerId, ...init);
  const [workerUrl, workerOptions] = init;
  const worker = new Worker(workerUrl, {
    ...workerOptions,
    name: workerOptions.name ?? workerId,
  });
  const caller = chrome.runtime.connect({ name: workerId });

  worker.addEventListener('error', event =>
    caller.postMessage({ event: 'error', init: toErrorEventInit(event) }),
  );
  worker.addEventListener('messageerror', event =>
    caller.postMessage({ event: 'messageerror', init: toMessageEventInit(event) }),
  );
  worker.addEventListener('message', event =>
    caller.postMessage({ event: 'message', init: toMessageEventInit(event) }),
  );

  // setup disconnect handler
  caller.onDisconnect.addListener(() => {
    console.log('entry workerPort onDisconnect', workerId);
    worker.terminate();
  });

  // begin event dispatch
  caller.onMessage.addListener((json: unknown) => {
    console.log('entry callerInputListener', json, workerId);
    if (isWorkerEvent(json)) {
      switch (json.event) {
        case 'message': {
          const { data } = validWorkerEventInit('message', json);
          worker.postMessage(data);
          return;
        }
        default:
          throw new Error('Unexpected event from caller', {
            cause: { json, workerId },
          });
      }
    }
  });

  return { workerId, caller };
};

const attachSession = (sessionPort: chrome.runtime.Port) => {
  console.log('attachSession', sessionPort.name);
  const workers = new Map<string, chrome.runtime.Port>();

  sessionPort.onMessage.addListener((json: unknown) => {
    console.log('entry control', json, sessionId);
    if (isOffscreenControl(json)) {
      switch (json.control) {
        case 'new-Worker': {
          const { workerId, caller } = constructWorker(
            validOffscreenControlData('new-Worker', json),
          );
          workers.set(workerId, caller);
          caller.onDisconnect.addListener(() => {
            workers.delete(workerId);
            if (!workers.size) {
              contemplate('no workers');
            }
          });
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
    workers.forEach(caller => caller.disconnect());
  });
};
