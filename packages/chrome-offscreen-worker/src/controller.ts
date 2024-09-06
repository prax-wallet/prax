/// <reference types="chrome" />

import { OffscreenControl } from './messages/offscreen-control.js';
import { WorkerConstructorParamsPrimitive } from './messages/primitive.js';

export class OffscreenController {
  private sessionPort?: Promise<chrome.runtime.Port>;
  private sessionId = crypto.randomUUID();
  private workers = new Map<string, chrome.runtime.Port>();

  private offscreenPath: string;

  private activeWorkers = 0;

  private justification =
    'Manages workers for parallelizing heavy computation outside of the service worker thread';

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
    offscreen: URL,
    private timeout = 10_000,
  ) {
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

  private async activateOffscreen() {
    const noOffscreen = chrome.runtime
      .getContexts({
        contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
      })
      .then(offscreenContexts => !offscreenContexts.length);

    if (!this.activeWorkers || (await noOffscreen)) {
      await chrome.offscreen
        .createDocument({
          url: new URL(`#${this.sessionId}`, this.offscreenPath).href,
          reasons: [chrome.offscreen.Reason.WORKERS],
          justification: this.justification,
        })
        .catch((e: unknown) => {
          // the offscreen window might have been created since we checked
          console.warn('Failed to create offscreen window', e);
        });
    }
  }

  private async releaseOffscreen() {
    if (!this.activeWorkers) {
      this.sessionPort = undefined;
      await chrome.offscreen.closeDocument();
    }
  }

  private async createOffscreen(): Promise<chrome.runtime.Port> {
    this.sessionPort ??= this.activateOffscreen().then(() => {
      const offscreenPort = chrome.runtime.connect({ name: this.sessionId });

      offscreenPort.onDisconnect.addListener(() => {
        void this.releaseOffscreen();
        this.workers.forEach(p => p.disconnect());
        this.workers.clear();
      });

      return offscreenPort;
    });

    return this.sessionPort;
  }

  public async constructWorker(
    ...init: WorkerConstructorParamsPrimitive
  ): Promise<chrome.runtime.Port> {
    this.activeWorkers++;
    const session = this.createOffscreen();

    const workerId = crypto.randomUUID();

    const newWorker: OffscreenControl<'new-Worker'> = {
      control: 'new-Worker',
      data: { workerId, init },
    };

    const {
      promise: workerConnection,
      resolve: resolveConnection,
      reject: rejectConnection,
    } = Promise.withResolvers<chrome.runtime.Port>();

    const workerConnect = (port: chrome.runtime.Port): void => {
      if (port.name === workerId) {
        resolveConnection(port);
        chrome.runtime.onConnect.removeListener(workerConnect);
      }
    };

    AbortSignal.timeout(this.timeout).onabort = function (this: AbortSignal) {
      rejectConnection(this.reason);
      chrome.runtime.onConnect.removeListener(workerConnect);
    };

    chrome.runtime.onConnect.addListener(workerConnect);

    (await session).postMessage(newWorker);

    void workerConnection.then(workerPort => {
      this.workers.set(workerId, workerPort);

      workerPort.onDisconnect.addListener(() => {
        this.activeWorkers--;
        this.workers.delete(workerId);
        if (!this.activeWorkers) {
          void session.then(p => p.disconnect());
        }
      });
    });

    return workerConnection;
  }
}
