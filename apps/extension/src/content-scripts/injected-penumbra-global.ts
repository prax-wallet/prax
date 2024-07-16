/**
 * This file is injected by the extension as a content script, to create the
 * mainworld global that allows pages to detect installed providers and connect
 * to them.
 *
 * The global is identified by `Symbol.for('penumbra')` and consists of a record
 * with string keys referring to `PenumbraProvider` objects that contain a
 * simple API. The identifiers on this record should be unique, and correspond
 * to a browser extension id. Providers should provide a link to their extension
 * manifest in their record entry.
 *
 * The global is frozen to discourage mutation, but you should consider that the
 * global and everything on it is only as trustable as the scripts running on
 * the page. Imports, requires, includes, script tags, packages your webapp
 * depends on, userscripts, or other extensions' content scripts could all
 * mutate or preempt this, and all have the power to interfere or intercept
 * connections.
 */

import { PenumbraProvider, PenumbraState, PenumbraSymbol } from '@penumbra-zone/client';
import { PenumbraStateEvent } from '@penumbra-zone/client/event';

import { PraxConnection } from '../message/prax';
import {
  isPraxFailureMessageEvent,
  isPraxPortMessageEvent,
  PraxMessage,
  unwrapPraxMessageEvent,
} from './message-event';

type PromiseSettledResultStatus = PromiseSettledResult<unknown>['status'];

class PraxInjection {
  private static singleton?: PraxInjection = new PraxInjection();

  public static get penumbra() {
    return new PraxInjection().injection;
  }

  private manifestUrl = `${PRAX_ORIGIN}/manifest.json`;
  private _request = Promise.withResolvers<void>();
  private _connect = Promise.withResolvers<MessagePort>();
  private _disconnect = Promise.withResolvers<void>();

  private connectState?: PromiseSettledResultStatus;
  private requestState?: PromiseSettledResultStatus;
  private disconnectState?: PromiseSettledResultStatus;

  private connectCalled = false;
  private requestCalled = false;
  private disconnectCalled = false;

  private stateEvents = new EventTarget();

  private injection: Readonly<PenumbraProvider> = Object.freeze({
    connect: () => {
      this.connectCalled = true;
      return this.reduceConnectionState() !== false
        ? this._connect.promise
        : this.connectionFailure();
    },

    disconnect: () => {
      this.disconnectCalled = true;
      return this.endConnection();
    },

    request: () => {
      this.requestCalled = true;
      return this.postRequest();
    },

    isConnected: () => this.reduceConnectionState(),

    state: () => this.reduceInjectionState(),

    manifest: String(this.manifestUrl),

    addEventListener: ((...params) =>
      this.stateEvents.addEventListener(...params)) as EventTarget['addEventListener'],

    removeEventListener: ((...params) =>
      this.stateEvents.removeEventListener(...params)) as EventTarget['removeEventListener'],
  });

  private constructor() {
    if (PraxInjection.singleton) {
      return PraxInjection.singleton;
    }

    window.addEventListener('message', this.connectionListener);
    void this._connect.promise.finally(() =>
      window.removeEventListener('message', this.connectionListener),
    );

    const dispatchStateEvent = () =>
      this.stateEvents.dispatchEvent(
        new PenumbraStateEvent(PRAX_ORIGIN, this.reduceInjectionState()),
      );

    void this._connect.promise
      .then(
        () => (this.connectState ??= 'fulfilled'),
        () => (this.connectState ??= 'rejected'),
      )
      .finally(dispatchStateEvent);

    void this._disconnect.promise
      .then(
        () => (this.disconnectState ??= 'fulfilled'),
        () => (this.disconnectState ??= 'rejected'),
      )
      .finally(dispatchStateEvent);

    void this._request.promise
      .then(
        () => (this.requestState ??= 'fulfilled'),
        () => (this.requestState ??= 'rejected'),
      )
      .finally(dispatchStateEvent);
  }

  /** Synchronously return the true/false/undefined page connection state of this
   * provider, without respect to what methods have been called.
   * - `true` indicates active connection.
   * - `false` indicates connection is closed or rejected.
   * - `undefined` indicates connection may be attempted.
   */
  private reduceConnectionState(): boolean | undefined {
    if (this.disconnectState) {
      return false;
    }
    if (this.requestState === 'rejected') {
      return false;
    }
    switch (this.connectState) {
      case 'rejected':
        return false;
      case 'fulfilled':
        return true;
      case undefined:
        return undefined;
    }
  }

  /** Returns a single overall injection state. */
  private reduceInjectionState(): PenumbraState {
    if (
      this.disconnectState === 'rejected' ||
      this.connectState === 'rejected' ||
      this.requestState === 'rejected'
    ) {
      return PenumbraState.Failed;
    }
    switch (this.disconnectCalled && this.disconnectState) {
      case false:
        break;
      default:
        return PenumbraState.Disconnected;
    }
    switch (this.connectCalled && this.connectState) {
      case false:
        break;
      case 'fulfilled':
        return PenumbraState.Connected;
      case undefined:
        return PenumbraState.ConnectPending;
    }
    switch (this.requestCalled && this.requestState) {
      case false:
        break;
      case 'fulfilled':
        return PenumbraState.Requested;
      case undefined:
        return PenumbraState.RequestPending;
    }
    return PenumbraState.Present;
  }

  /** this listener will resolve the connection promise AND request promise when
   * the isolated content script injected-connection-port sends a `MessagePort` */
  private connectionListener = (msg: MessageEvent<unknown>) => {
    if (msg.origin === window.origin && isPraxPortMessageEvent(msg)) {
      const praxPort = unwrapPraxMessageEvent(msg);
      this._connect.resolve(praxPort);
      this._request.resolve();
    }
  };

  /** this listener only rejects the request promise. success of the request
   * promise is indicated by the connection promise being resolved.
   */
  private requestFailureListener = (msg: MessageEvent<unknown>) => {
    if (msg.origin === window.origin && isPraxFailureMessageEvent(msg)) {
      const cause = unwrapPraxMessageEvent(msg);
      const failure = new Error('Connection request failed', { cause });
      this._request.reject(failure);
    }
  };

  /** rejects with the most relevant reason
   * - disconnect
   * - connection failure
   * - request failure
   */
  private connectionFailure(): Promise<never> {
    // Promise.race checks in order of the list index. so if more than one
    // promise in the list is already settled, it responds with the result of
    // the earlier index
    return Promise.race([
      // rejects with disconnect failure, or 'Disconnected' if disconnect was successful
      this._disconnect.promise.then(() => Promise.reject(Error('Disconnected'))),
      // rejects with connect failure, never resolves
      this._connect.promise.then(() => new Promise<never>(() => null)),
      // rejects with previous failure, or 'Disconnected' if request was successful
      this._request.promise.then(() => Promise.reject(Error('Disconnected'))),
      // this should be unreachable
      Promise.resolve(null as never),
    ]);
  }

  private postRequest() {
    switch (this.reduceConnectionState()) {
      case true: // connection is already active
        this._request.resolve();
        break;
      case false: // connection is already failed
        void this.connectionFailure().catch((u: unknown) => this._request.reject(u));
        // a previous request may have succeeded, so also return the failure directly
        return this.connectionFailure();
      case undefined: // no request made yet. attach listener and emit
        window.addEventListener('message', this.requestFailureListener);
        void this._request.promise.finally(() =>
          window.removeEventListener('message', this.requestFailureListener),
        );
        window.postMessage(
          { [PRAX]: PraxConnection.Request } satisfies PraxMessage<PraxConnection.Request>,
          window.origin,
        );
        break;
    }

    return this._request.promise;
  }

  private endConnection() {
    // attempt actual disconnect
    void this._connect.promise
      .then(
        port => {
          port.postMessage(false);
          port.close();
        },
        (e: unknown) => console.warn('Could not attempt disconnect', e),
      )
      .catch((e: unknown) => console.error('Disconnect failed', e));
    window.postMessage(
      { [PRAX]: PraxConnection.Disconnect } satisfies PraxMessage<PraxConnection.Disconnect>,
      '/',
    );

    // resolve the promise by state
    switch (this.reduceConnectionState()) {
      case true: // connection was active, will now become now disconnected
        this._disconnect.resolve();
        break;
      case false: // connection was already inactive. can't disconnect in this state
        this._disconnect.reject(Error('Connection already inactive'));
        break;
      case undefined: // connection was never attempted. can't disconnect in this state
        this._disconnect.reject(Error('Connection not yet active'));
        break;
    }

    return this._disconnect.promise;
  }
}

// inject prax
Object.defineProperty(
  window[PenumbraSymbol] ??
    // create the global if not present
    Object.defineProperty(window, PenumbraSymbol, { value: {}, writable: false })[PenumbraSymbol],
  PRAX_ORIGIN,
  {
    value: PraxInjection.penumbra,
    writable: false,
    enumerable: true,
  },
);
