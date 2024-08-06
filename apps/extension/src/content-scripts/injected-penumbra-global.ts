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

import '@penumbra-zone/client/global';

import { PenumbraStateEvent } from '@penumbra-zone/client/event';
import { type PenumbraProvider } from '@penumbra-zone/client/provider';
import { PenumbraState } from '@penumbra-zone/client/state';
import { PenumbraSymbol } from '@penumbra-zone/client/symbol';

import { PraxConnection } from '../message/prax';
import {
  isPraxEndMessageEvent,
  isPraxFailureMessageEvent,
  isPraxPortMessageEvent,
  PraxMessage,
  unwrapPraxMessageEvent,
} from './message-event';

const connectMessage = {
  [PRAX]: PraxConnection.Connect,
} satisfies PraxMessage<PraxConnection.Connect>;

const disconnectMessage = {
  [PRAX]: PraxConnection.Disconnect,
} satisfies PraxMessage<PraxConnection.Disconnect>;

class PraxInjection {
  private static singleton?: PraxInjection = new PraxInjection();

  public static get penumbra() {
    return new PraxInjection().injection;
  }

  private port?: MessagePort;
  private presentState: PenumbraState = PenumbraState.Disconnected;
  private manifestUrl = `${PRAX_ORIGIN}/manifest.json`;
  private stateEvents = new EventTarget();

  private injection: Readonly<PenumbraProvider> = Object.freeze({
    connect: () => Promise.resolve(this.port ?? this.postConnectRequest()),
    disconnect: () => this.postDisconnectRequest(),
    isConnected: () => Boolean(this.port && this.presentState === PenumbraState.Connected),
    state: () => this.presentState,
    manifest: String(this.manifestUrl),
    addEventListener: this.stateEvents.addEventListener.bind(this.stateEvents),
    removeEventListener: this.stateEvents.removeEventListener.bind(this.stateEvents),
  });

  private constructor() {
    if (PraxInjection.singleton) {
      return PraxInjection.singleton;
    }
  }

  private setConnected(port: MessagePort) {
    console.log('setConnected', port);
    this.port = port;
    this.presentState = PenumbraState.Connected;
    this.stateEvents.dispatchEvent(new PenumbraStateEvent(PRAX_ORIGIN, this.presentState));
  }

  private setDisconnected() {
    console.log('setDisconnected');
    this.port = undefined;
    this.presentState = PenumbraState.Disconnected;
    this.stateEvents.dispatchEvent(new PenumbraStateEvent(PRAX_ORIGIN, this.presentState));
  }

  private setPending() {
    console.log('setPending');
    this.port = undefined;
    this.presentState = PenumbraState.Pending;
    this.stateEvents.dispatchEvent(new PenumbraStateEvent(PRAX_ORIGIN, this.presentState));
  }

  private postConnectRequest() {
    console.log('postConnectRequest');
    this.setPending();

    const connection = Promise.withResolvers<MessagePort>();
    const listener = (msg: MessageEvent<unknown>) => {
      if (msg.origin === window.origin) {
        if (isPraxPortMessageEvent(msg)) {
          connection.resolve(unwrapPraxMessageEvent(msg));
        } else if (isPraxFailureMessageEvent(msg)) {
          connection.reject(
            new Error('Connection request failed', { cause: unwrapPraxMessageEvent(msg) }),
          );
        }
      }
    };

    void connection.promise
      .then(port => this.setConnected(port))
      .catch(() => this.setDisconnected())
      .finally(() => window.removeEventListener('message', listener));
    window.addEventListener('message', listener);

    console.log('window.postMessage', connectMessage);
    window.postMessage(connectMessage, '/', []);

    return connection.promise;
  }

  private postDisconnectRequest() {
    console.log('postDisconnectRequest');
    const disconnection = Promise.withResolvers<void>();
    const listener = (msg: MessageEvent<unknown>) => {
      if (msg.origin === window.origin) {
        if (isPraxEndMessageEvent(msg)) {
          disconnection.resolve();
        } else if (isPraxFailureMessageEvent(msg)) {
          disconnection.reject(
            new Error('Disconnect request failed', { cause: unwrapPraxMessageEvent(msg) }),
          );
        }
      }
    };

    this.setDisconnected();
    void disconnection.promise.finally(() => window.removeEventListener('message', listener));
    window.addEventListener('message', listener);

    console.log('window.postMessage', disconnectMessage);
    window.postMessage(disconnectMessage, '/');

    return disconnection.promise;
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
