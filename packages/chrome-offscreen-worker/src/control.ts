/// <reference types="chrome" />

import { OffscreenWorkerPort } from './messages/worker-event.js';
import { OffscreenRootPort, WorkerConstructorParamsPrimitive } from './messages/root-control.js';

const attempts: string[] = [];

export class OffscreenControl {
  private session?: OffscreenRootPort;
  private workers = new Map<string, OffscreenWorkerPort>();

  private offscreenPath: string;

  /**
   * This class manages the offscreen document and worker connections. Your
   * offscreen document should use the `entry` export of this package, a
   * side-effectful module which attaches listeners and manages the actual
   * workers.
   *
   * @param offscreenUrl a fully-qualified URL to your offscreen document, as output by `chrome.runtime.getURL`
   * @param timeout wait for the offscreen document to connect to this controller, upon first worker init (10s default)
   */
  constructor(
    offscreenUrl: `chrome-extension://${string}/${string}`,
    private timeout = 10_000,
  ) {
    const offscreen = new URL(offscreenUrl);
    if (
      offscreen.hash !== '' ||
      offscreen.protocol !== 'chrome-extension:' ||
      offscreen.host !== chrome.runtime.id ||
      offscreen.origin !== origin ||
      !offscreen.href.startsWith(chrome.runtime.getURL('/'))
    ) {
      throw new Error('Invalid offscreen path');
    }
    this.offscreenPath = offscreen.href;
  }

  private async createOffscreen(): Promise<OffscreenRootPort> {
    const {
      promise: offscreenConnection,
      resolve: resolveConnection,
      reject: rejectConnection,
    } = Promise.withResolvers<chrome.runtime.Port>();

    const hasOffscreen = async () => {
      console.log('hasOffscreen');
      const contexts = await chrome.runtime.getContexts({
        contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
      });
      console.log('hasOffscreen contexts', contexts);
      const found = contexts.find(ctx => {
        console.log('contexts.find', ctx.documentUrl, this.offscreenPath);
        return ctx.documentUrl?.startsWith(this.offscreenPath);
      });
      console.log('hasOffscreen found', found);
      return found;
    };

    let offscreenHash: string | undefined;
    try {
      const offscreenContext = await hasOffscreen();
      if (!offscreenContext?.documentUrl) {
        console.log('createOffscreen !offscreenContext');
        const offscreenInitUrl = new URL(`#${crypto.randomUUID()}`, this.offscreenPath);
        console.log('initting', offscreenInitUrl.href);
        await chrome.offscreen.createDocument({
          url: offscreenInitUrl.href,
          reasons: [chrome.offscreen.Reason.WORKERS],
          justification:
            'Manages workers for parallelizing heavy computation outside of the service worker thread',
        });
        offscreenHash = offscreenInitUrl.hash;
        console.log('createOffscreen created offscreenHash', offscreenInitUrl, offscreenHash);
      } else {
        offscreenHash = new URL(offscreenContext.documentUrl).hash;
        console.log('createOffscreen located offscreenHash', offscreenHash);
      }
    } catch (creationFailure) {
      console.warn(
        "Failed to create offscreen document, you'll probably time out now",
        creationFailure,
        globalThis.location,
      );
      const offscreenContext = offscreenHash ? undefined : await hasOffscreen();
      if (offscreenContext?.documentUrl) {
        console.warn('Found offscreen context after failure', offscreenContext.documentUrl);
        if (offscreenHash) {
          console.warn('Discarding due to present', offscreenHash);
        }
        offscreenHash ??= new URL(offscreenContext.documentUrl).hash;
      }
    } finally {
      const attempt = offscreenHash ?? 'no hash';
      attempts.push(attempt);
      console.warn('attempt', attempts.length, attempt);
    }

    if (!offscreenHash) {
      rejectConnection('No offscreen context');
    } else {
      const sessionPort = chrome.runtime.connect({ name: offscreenHash });
      sessionPort.onDisconnect.addListener(() => {
        this.workers.forEach(p => p.disconnect());
        this.workers.clear();
      });
      resolveConnection(sessionPort);
    }

    return offscreenConnection;
  }

  public async constructWorker(
    ...init: WorkerConstructorParamsPrimitive
  ): Promise<OffscreenWorkerPort> {
    const workerId = crypto.randomUUID();

    const {
      promise: workerConnection,
      resolve: resolveConnection,
      reject: rejectConnection,
    } = Promise.withResolvers<chrome.runtime.Port>();

    this.session ??= await this.createOffscreen();

    const workerConnect = (port: chrome.runtime.Port): void => {
      if (port.name === workerId) {
        resolveConnection(port);
        chrome.runtime.onConnect.removeListener(workerConnect);
      }
    };

    const signal = AbortSignal.timeout(this.timeout);
    signal.onabort = () => {
      rejectConnection(signal.reason);
      chrome.runtime.onConnect.removeListener(workerConnect);
    };

    chrome.runtime.onConnect.addListener(workerConnect);

    this.session.postMessage({
      type: 'new',
      control: { workerId, init },
    });

    void workerConnection.then(workerPort => {
      this.workers.set(workerId, workerPort);

      workerPort.onDisconnect.addListener(() => {
        this.workers.delete(workerId);
        if (!this.workers.size) {
          this.session?.disconnect();
        }
      });
    });

    return workerConnection;
  }
}
