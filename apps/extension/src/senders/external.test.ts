import { describe, it, expect } from 'vitest';
import { assertValidExternalSender } from './external';

describe('assertValidSender', () => {
  const mockValid: chrome.runtime.MessageSender = {
    tab: { id: 1 } as chrome.tabs.Tab,
    frameId: 0,
    documentId: 'mockId',
    documentLifecycle: 'active',
    origin: 'https://example.com:1234',
    url: 'https://user:pass@example.com:1234/some/pa;th%20%22%00?query=arg&another=value&et;c+2+22%20#hash#hash%in',
  };

  it('succeeds if all conditions are met', () => {
    expect(() => assertValidExternalSender(mockValid)).not.toThrow();
  });

  it('succeeds when host contains ipv4 address', () => {
    const ipv6Origin: chrome.runtime.MessageSender = {
      ...mockValid,
      origin: 'https://10.20.30.40',
      url: 'https://10.20.30.40/index.html',
    };
    expect(() => assertValidExternalSender(ipv6Origin)).not.toThrow();
  });

  it('succeeds when host contains ipv6 address', () => {
    const ipv6Origin: chrome.runtime.MessageSender = {
      ...mockValid,
      origin: 'https://[fedc:ba98:7654:3210:fedc:ba98:7654:3210]',
      url: 'https://[fedc:ba98:7654:3210:fedc:ba98:7654:3210]/index.html',
    };
    expect(() => assertValidExternalSender(ipv6Origin)).not.toThrow();
  });

  it('throws if sender undefined', () => {
    expect(() => assertValidExternalSender(undefined)).toThrow('Sender undefined');
  });

  it('throws if sender is not a tab', () => {
    const tabless = { ...mockValid, tab: undefined };
    expect(() => assertValidExternalSender(tabless)).toThrow('Sender is not a tab');
  });

  it('throws if sender is not a top-level frame', () => {
    const iframed: chrome.runtime.MessageSender = {
      ...mockValid,
      frameId: 1,
    };
    expect(() => assertValidExternalSender(iframed)).toThrow('Sender is not a top-level frame');
  });

  it('throws if sender is not a document', () => {
    const notDoc: chrome.runtime.MessageSender = {
      ...mockValid,
      documentId: undefined,
    };
    expect(() => assertValidExternalSender(notDoc)).toThrow('Sender is not a document');
  });

  it('throws if sender is not active', () => {
    const inactive: chrome.runtime.MessageSender = {
      ...mockValid,
      documentLifecycle: 'prerender',
    };
    expect(() => assertValidExternalSender(inactive)).toThrow('Sender is not active');
  });

  it('throws if sender has no origin', () => {
    const originless: chrome.runtime.MessageSender = {
      ...mockValid,
      origin: undefined,
    };
    expect(() => assertValidExternalSender(originless)).toThrow('Sender has no origin');
  });

  it('throws if sender origin is unparseable', () => {
    const unparseableOrigin: chrome.runtime.MessageSender = {
      ...mockValid,
      origin: 'lol,',
    };
    expect(() => assertValidExternalSender(unparseableOrigin)).toThrow('Invalid URL');
  });

  it("throws if sender origin can't roundtrip", () => {
    const invalidOrigin: chrome.runtime.MessageSender = {
      ...mockValid,
      // cyrillic lookalike for latin 'a' in hostname
      origin: 'https://exаmple.com',
    };
    expect(() => assertValidExternalSender(invalidOrigin)).toThrow('Sender origin is invalid');
  });

  it('throws if sender origin contains path', () => {
    const invalidOrigin: chrome.runtime.MessageSender = {
      ...mockValid,
      // trailing slash is a path, not part of an origin
      origin: 'https://example.com/',
    };
    expect(() => assertValidExternalSender(invalidOrigin)).toThrow('Sender origin is invalid');
  });

  it('throws if sender protocol is not allowlisted', () => {
    const invalidProtocol: chrome.runtime.MessageSender = {
      ...mockValid,
      origin: 'http://example.com',
    };
    expect(() => assertValidExternalSender(invalidProtocol)).toThrow('Sender protocol is not');
  });

  it(`throws if sender protocol is http and origin is localhost but not in dev mode`, () => {
    globalThis.__DEV__ = true;
    const localhostSender: chrome.runtime.MessageSender = {
      ...mockValid,
      origin: 'http://localhost:8000',
      url: 'http://localhost:8000/index.html',
    };
    expect(() => assertValidExternalSender(localhostSender)).not.toThrow();
  });

  it('succeeds if sender protocol is not https, but is http and origin is localhost', () => {
    const localhostSender: chrome.runtime.MessageSender = {
      ...mockValid,
      origin: 'http://localhost',
      url: 'http://localhost/index.html',
    };
    expect(() => assertValidExternalSender(localhostSender)).not.toThrow();
  });

  it(`succeeds if sender protocol is http and origin is localhost with port specified in dev mode`, () => {
    globalThis.__DEV__ = true;
    const localhostSender: chrome.runtime.MessageSender = {
      ...mockValid,
      origin: 'http://localhost:8000',
      url: 'http://localhost:8000/index.html',
    };
    expect(() => assertValidExternalSender(localhostSender)).not.toThrow();
  });

  it('throws if sender has no URL', () => {
    const urlless: chrome.runtime.MessageSender = {
      ...mockValid,
      url: undefined,
    };
    expect(() => assertValidExternalSender(urlless)).toThrow('Sender has no URL');
  });

  it("throws if sender URL can't roundtrip", () => {
    const invalidUrl: chrome.runtime.MessageSender = {
      ...mockValid,
      // unicode RTL override in URL
      origin: 'https://example.invalid',
      url: 'https://‮sdrawkcab%2Fmoc.elpmaxe@example.su/',
    };
    expect(() => assertValidExternalSender(invalidUrl)).toThrow('Sender URL is invalid');
  });

  it('throws if sender URL has unexpected host', () => {
    const different: chrome.runtime.MessageSender = {
      ...mockValid,
      origin: 'https://example.com',
      url: 'https://example.net/some/path',
    };
    expect(() => assertValidExternalSender(different)).toThrow('Sender URL has unexpected origin');
  });

  it('throws if sender URL has unexpected port', () => {
    const different: chrome.runtime.MessageSender = {
      ...mockValid,
      origin: 'https://example.com',
      url: 'https://example.com:123/some/path',
    };
    expect(() => assertValidExternalSender(different)).toThrow('Sender URL has unexpected origin');
  });

  it('throws if sender URL is missing expected port', () => {
    const different: chrome.runtime.MessageSender = {
      ...mockValid,
      origin: 'https://example.com:999',
      url: 'https://example.com/some/path',
    };
    expect(() => assertValidExternalSender(different)).toThrow('Sender URL has unexpected origin');
  });
});
