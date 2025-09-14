/**
 * Test setup for Tasks App Demo
 */

import { vi } from 'vitest';

// Mock browser APIs that might not be available in test environment
global.navigator = global.navigator || {};
global.window = global.window || {};

// Mock Service Worker
global.navigator.serviceWorker = {
  register: vi.fn().mockResolvedValue({
    scope: '/',
    active: null,
    installing: null,
    waiting: null,
    addEventListener: vi.fn(),
    unregister: vi.fn().mockResolvedValue(true)
  }),
  controller: null,
  addEventListener: vi.fn()
};

// Mock IndexedDB
global.indexedDB = {
  open: vi.fn().mockResolvedValue({
    result: {
      objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
      createObjectStore: vi.fn().mockReturnValue({
        createIndex: vi.fn()
      }),
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          put: vi.fn(),
          get: vi.fn(),
          getAll: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn()
        })
      })
    }
  })
};

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue('')
});

// Mock WebAuthn APIs
global.navigator.credentials = {
  create: vi.fn().mockResolvedValue({}),
  get: vi.fn().mockResolvedValue({})
};

// Mock location
global.location = {
  origin: 'http://localhost:5176',
  href: 'http://localhost:5176',
  pathname: '/',
  search: '',
  hash: ''
};

// Mock window properties
global.window.location = global.location;
global.window.navigator = global.navigator;
global.window.localStorage = global.localStorage;
global.window.indexedDB = global.indexedDB;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => setTimeout(callback, 16));
global.cancelAnimationFrame = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock MessageChannel
global.MessageChannel = vi.fn().mockImplementation(() => ({
  port1: {
    onmessage: null,
    postMessage: vi.fn(),
    close: vi.fn()
  },
  port2: {
    onmessage: null,
    postMessage: vi.fn(),
    close: vi.fn()
  }
}));

// Mock online/offline events
global.window.addEventListener = vi.fn();
global.window.removeEventListener = vi.fn();

// Set online status
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true
});

console.log('Test setup complete - mocked browser APIs for Tasks App Demo');
