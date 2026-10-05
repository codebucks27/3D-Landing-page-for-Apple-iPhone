import { readFile, realpath } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

/**
 * Keep the real Three loaders, but serve public fixtures without a live server.
 * Every attempted request is logged; no fallback ever calls a native transport.
 * @param {Window & typeof globalThis} browser
 * @param {string} publicDirectory
 */
export function createOfflineNetwork(browser, publicDirectory) {
  const NativeRequest = globalThis.Request;
  const NativeResponse = globalThis.Response;
  const requests = [];
  const contentTypes = {
    '.gltf': 'model/gltf+json',
    '.bin': 'application/octet-stream',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.hdr': 'application/octet-stream',
  };

  function record(entry) {
    requests.push(entry);
    console.info(`[test-network] ${JSON.stringify(entry)}`);
  }

  function block(transport, method, url) {
    record({ transport, method, url, result: 'blocked' });
    return new Error(`Test network blocked ${transport} ${method} ${url}; use a local public fixture.`);
  }

  // Node's Request requires absolute URLs. Browsers resolve them against the page.
  class BrowserRequest extends NativeRequest {
    /** @param {RequestInfo | URL} input @param {RequestInit} [init] */
    constructor(input, init) {
      super(typeof input === 'string' ? new URL(input, browser.location.href).href : input, init);
    }
  }

  /** @param {RequestInfo | URL} input @param {RequestInit} [init] */
  async function fetchFixture(input, init) {
    const request = new BrowserRequest(input, init);
    const url = new URL(request.url);
    request.signal.throwIfAborted();
    if (url.origin !== browser.location.origin || request.method !== 'GET') {
      throw block('fetch', request.method, url.href);
    }

    const root = await realpath(publicDirectory);
    let fixture;
    try {
      fixture = await realpath(resolve(root, `.${decodeURIComponent(url.pathname)}`));
    } catch {
      throw block('fetch', request.method, url.href);
    }
    if (!fixture.startsWith(root + sep)) {
      throw block('fetch', request.method, url.href);
    }

    const contents = await readFile(fixture);
    request.signal.throwIfAborted();
    record({ transport: 'fetch', method: request.method, url: url.href, result: 'fixture', fixture, bytes: contents.length });
    const response = new NativeResponse(new Uint8Array(contents).buffer, {
      status: 200,
      headers: {
        'content-type': contentTypes[extname(fixture)] || 'application/octet-stream',
        'content-length': String(contents.length),
      },
    });
    Object.defineProperty(response, 'url', { value: url.href });
    return response;
  }

  class OfflineXMLHttpRequest extends browser.XMLHttpRequest {
    open(method, url, ...args) {
      throw block('XMLHttpRequest', method, new URL(String(url), browser.location.href).href);
    }
  }

  class OfflineWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    constructor(url, protocols) {
      throw block('WebSocket', 'CONNECT', new URL(String(url), browser.location.href).href);
    }
  }

  class OfflineEventSource {
    constructor(url, options) {
      throw block('EventSource', 'GET', new URL(String(url), browser.location.href).href);
    }
  }

  return {
    requests,
    Request: BrowserRequest,
    fetch: fetchFixture,
    XMLHttpRequest: OfflineXMLHttpRequest,
    WebSocket: OfflineWebSocket,
    EventSource: OfflineEventSource,
    sendBeacon(url, data) {
      throw block('sendBeacon', 'POST', new URL(String(url), browser.location.href).href);
    },
  };
}
