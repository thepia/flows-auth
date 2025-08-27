/**
 * Test setup configuration
 */
import { afterEach, vi, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import '@testing-library/jest-dom';

// Mock the error reporter module before it's imported anywhere else
vi.mock('../src/utils/errorReporter', () => ({
  initializeErrorReporter: vi.fn(),
  updateErrorReporterConfig: vi.fn(),
  reportAuthState: vi.fn(),
  reportWebAuthnError: vi.fn(),
  reportApiError: vi.fn(),
  flushErrorReports: vi.fn(),
  getErrorReportQueueSize: vi.fn(() => 0)
}));

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

// Client-side library - no server polyfills needed
// Tests should use jsdom environment which provides browser APIs
// For integration tests, individual tests can configure fetch as needed

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

// Ensure window has dispatchEvent function
if (!window.dispatchEvent || typeof window.dispatchEvent !== 'function') {
  const eventListeners = new Map<string, Set<EventListener>>();
  
  window.addEventListener = vi.fn((type: string, listener: EventListener) => {
    if (!eventListeners.has(type)) {
      eventListeners.set(type, new Set());
    }
    eventListeners.get(type)?.add(listener);
  });
  
  window.removeEventListener = vi.fn((type: string, listener: EventListener) => {
    eventListeners.get(type)?.delete(listener);
  });
  
  window.dispatchEvent = vi.fn((event: Event) => {
    const listeners = eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (e) {
          console.error('Error in event listener:', e);
        }
      });
    }
    return true;
  });
}

// Setup before all tests  
beforeAll(() => {
  /**
   * ⚠️ CRITICAL: NO MOCKING POLICY FOR INTEGRATION TESTS
   * ====================================================
   * 
   * INTEGRATION TESTS: Use real fetch, real networking, real API calls
   * UNIT TESTS: Mock fetch in individual test files as needed
   * 
   * This global setup DOES NOT mock fetch or networking.
   * Integration tests MUST use real network access to validate against live API servers.
   * Any mocking in integration tests requires explicit sign-off and highest scrutiny.
   * 
   * We only mock the error reporter module to prevent test interference.
   */
  
  // Do NOT mock fetch at all - let all tests use real networking
  // Integration tests need real API calls, unit tests should mock individually
  console.log('🚨 Test setup: NO fetch mocking - using real networking for all tests');
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorageMock.clear();
  vi.clearAllMocks();
});