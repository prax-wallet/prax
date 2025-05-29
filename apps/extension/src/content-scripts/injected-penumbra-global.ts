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

import { PenumbraRequestFailure } from '@penumbra-zone/client/error';
import { createPenumbraStateEvent } from '@penumbra-zone/client/event';
import type { PenumbraProvider } from '@penumbra-zone/client/provider';
import { PenumbraState } from '@penumbra-zone/client/state';
import { PenumbraSymbol } from '@penumbra-zone/client/symbol';
import { PraxConnection } from './message/prax-connection';
import { PraxControl } from './message/prax-control';
import { PraxMessageEvent, unwrapPraxMessageEvent } from './message/prax-message-event';
import { listenWindow, sendWindow } from './message/send-window';

const isPenumbraRequestFailure = (data: unknown): data is PenumbraRequestFailure =>
  typeof data === 'string' && data in PenumbraRequestFailure;

class PraxInjection {
  private static singleton?: PraxInjection = new PraxInjection();

  public static get penumbra() {
    return new PraxInjection().injection;
  }

  private presentState: PenumbraState = PenumbraState.Disconnected;
  private manifestUrl = `${PRAX_ORIGIN}/manifest.json`;
  private stateEvents = new EventTarget();

  private readonly injection: Readonly<PenumbraProvider> = Object.freeze({
    connect: () => this.postConnectRequest(),
    disconnect: () => this.postDisconnectRequest(),
    isConnected: () => this.presentState === PenumbraState.Connected,
    state: () => this.presentState,
    manifest: String(this.manifestUrl),
    addEventListener: this.stateEvents.addEventListener.bind(this.stateEvents),
    removeEventListener: this.stateEvents.removeEventListener.bind(this.stateEvents),
  });

  private constructor() {
    if (PraxInjection.singleton) {
      return PraxInjection.singleton;
    }

    // ambient end listener
    const ambientEndListener = (ev: PraxMessageEvent): void => {
      const content = unwrapPraxMessageEvent(ev);
      if (content === PraxControl.End) {
        this.setState(PenumbraState.Disconnected);
      }
    };
    listenWindow(undefined, ambientEndListener);

    const listenAc = new AbortController();
    const preconnectListener = (ev: PraxMessageEvent): void => {
      const content = unwrapPraxMessageEvent(ev);
      if (content !== PraxConnection.Load) {
        // anything other than our own announcement will remove the listener
        listenAc.abort();

        if (content === PraxControl.Preconnect) {
          ev.stopImmediatePropagation();
          this.setState(PenumbraState.Connected);
        } else if (globalThis.__DEV__) {
          console.debug('Preconnect cancelled', { content, ev });
        }
      }
    };
    listenWindow(listenAc.signal, preconnectListener);

    // announce
    sendWindow<PraxConnection>(PraxConnection.Load);
  }

  private setState(state: PenumbraState) {
    if (this.presentState !== state) {
      this.presentState = state;
      this.stateEvents.dispatchEvent(createPenumbraStateEvent(PRAX_ORIGIN, this.presentState));
    }
  }

  private postConnectRequest() {
    if (this.presentState !== PenumbraState.Connected) {
      this.setState(PenumbraState.Pending);
    }
    const attempt = this.listenPortMessage();
    sendWindow<PraxConnection>(PraxConnection.Connect);
    return attempt;
  }

  private postDisconnectRequest() {
    const attempt = this.listenEndMessage();
    sendWindow<PraxConnection>(PraxConnection.Disconnect);
    return attempt;
  }

  private listenPortMessage() {
    const connection = Promise.withResolvers<MessagePort>();

    const listenAc = new AbortController();
    const portListener = (ev: PraxMessageEvent): void => {
      const content = unwrapPraxMessageEvent(ev);
      if (content instanceof MessagePort) {
        ev.stopImmediatePropagation();
        connection.resolve(content);
      } else if (isPenumbraRequestFailure(content)) {
        ev.stopImmediatePropagation();
        connection.reject(new Error('Connection request failed', { cause: content }));
      }
    };
    listenWindow(listenAc.signal, portListener);

    void connection.promise
      .then(() => this.setState(PenumbraState.Connected))
      .catch(() => this.setState(PenumbraState.Disconnected))
      .finally(() => listenAc.abort());

    return connection.promise;
  }

  private listenEndMessage() {
    const disconnection = Promise.withResolvers<void>();

    const listenAc = new AbortController();
    const endListener = (ev: PraxMessageEvent): void => {
      const content = unwrapPraxMessageEvent(ev);
      if (content === PraxControl.End) {
        ev.stopImmediatePropagation();
        disconnection.resolve();
      } else if (isPenumbraRequestFailure(content)) {
        ev.stopImmediatePropagation();
        disconnection.reject(new Error('Disconnect request failed', { cause: content }));
      }
    };
    listenWindow(listenAc.signal, endListener);

    void disconnection.promise.finally(() => {
      this.setState(PenumbraState.Disconnected);
      listenAc.abort();
    });

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
