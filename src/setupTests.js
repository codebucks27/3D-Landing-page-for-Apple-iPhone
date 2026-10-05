// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';
import { ResizeObserver } from '@juggle/resize-observer';
import { afterAll, vi } from 'vitest';
import { resolve } from 'node:path';
import { installMatchMedia } from './test-support/browserMedia';
import { createOfflineNetwork } from './test-support/offlineNetwork';

const restoreMatchMedia = installMatchMedia(window);
vi.stubGlobal('ResizeObserver', ResizeObserver);

const offlineNetwork = createOfflineNetwork(window, resolve(import.meta.dirname, '../public'));
vi.stubGlobal('Request', offlineNetwork.Request);
vi.stubGlobal('fetch', offlineNetwork.fetch);
vi.stubGlobal('XMLHttpRequest', offlineNetwork.XMLHttpRequest);
vi.stubGlobal('WebSocket', offlineNetwork.WebSocket);
vi.stubGlobal('EventSource', offlineNetwork.EventSource);
Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: offlineNetwork.sendBeacon });

// Leave network guards installed until the worker closes so asynchronous model
// preload work cannot escape to a native transport after the test finishes.
afterAll(restoreMatchMedia);
