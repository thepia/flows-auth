/**
 * Test setup configuration
 */
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import '@testing-library/jest-dom';

// Mock browser APIs for testing
const localStorageMock = {
  store: new Map(),
  getItem(key: string) {
    return this.store.get(key) || null;
  },
  setItem(key: string, value: string) {
    this.store.set(key, value);
  },
  removeItem(key: string) {
    this.store.delete(key);
  },
  clear() {
    this.store.clear();
  }
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Provide fetch for testing
// For integration tests, we need real fetch
// For unit tests, it will be mocked by individual test files
if (!global.fetch) {
  // Add fetch polyfill for Node.js environment
  const nodeFetch = require('node-fetch');
  global.fetch = nodeFetch;
  global.Request = nodeFetch.Request;
  global.Response = nodeFetch.Response;
  global.Headers = nodeFetch.Headers;
}

// Mock WebAuthn for passkey testing - use writable: true to allow redefinition
Object.defineProperty(window, 'PublicKeyCredential', {
  value: class MockPublicKeyCredential {
    static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(true);
  },
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'PublicKeyCredential', {
  value: class MockPublicKeyCredential {
    static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(true);
  },
  writable: true,
  configurable: true
});

Object.defineProperty(navigator, 'credentials', {
  value: {
    create: vi.fn(),
    get: vi.fn()
  },
  writable: true,
  configurable: true
});

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  writable: true
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorageMock.clear();
  vi.clearAllMocks();
});