import { ConnectError } from '@connectrpc/connect';
import { errorToJson } from '@connectrpc/connect/protocol-connect';
import type { BuildAction } from '../offscreen-client';
import { JsonValue } from '@bufbuild/protobuf';
import { isInternalServiceWorkerSender } from '../senders/internal';

const isOffscreenBuildActionRequest = (req?: unknown): req is { Offscreen: BuildAction } =>
  req != null &&
  typeof req === 'object' &&
  'Offscreen' in req &&
  req.Offscreen != null &&
  typeof req.Offscreen === 'object' &&
  'actionPlanIndex' in req.Offscreen;

chrome.runtime.onMessage.addListener((req: unknown, sender, respond) => {
  if (isInternalServiceWorkerSender(sender) && isOffscreenBuildActionRequest(req)) {
    void spawnActionBuildWorker(req.Offscreen).then(
      actionJson => respond(actionJson),
      (e: unknown) => respond({ error: errorToJson(ConnectError.from(e), undefined) }),
    );
    return true;
  }
  return false;
});

const spawnActionBuildWorker = (req: BuildAction) => {
  const { promise, resolve, reject } = Promise.withResolvers<JsonValue>();

  const worker = new Worker(new URL('../wasm-build-action.ts', import.meta.url));

  const onWorkerMessage = (e: MessageEvent) => resolve(e.data as JsonValue);

  const onWorkerError = (ev: ErrorEvent) =>
    reject(ev.error ?? new Error(ev.message, { cause: ev }));

  const onWorkerMessageError = (ev: MessageEvent) => reject(ConnectError.from(ev.data ?? ev));

  worker.addEventListener('message', onWorkerMessage, { once: true });
  worker.addEventListener('error', onWorkerError, { once: true });
  worker.addEventListener('messageerror', onWorkerMessageError, { once: true });

  worker.postMessage(req);

  return promise.finally(() => worker.terminate());
};
