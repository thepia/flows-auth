import { cleanup } from '@testing-library/svelte';
/**
 * Test setup configuration
 */
import { afterEach, beforeAll, vi } from 'vitest';
import '@testing-library/jest-dom';
// Import vitest setup for automatic cleanup
import '@testing-library/svelte/vitest';

// Mock the error reporter module before it's imported anywhere else
vi.mock('../src/utils/telemetry', () => ({
  initializeTelemetry: vi.fn(),
  updateErrorReporterConfig: vi.fn(),
  reportAuthState: vi.fn(),
  reportWebAuthnError: vi.fn(),
  reportApiError: vi.fn(),
  flushErrorReports: vi.fn(),
  getErrorReportQueueSize: vi.fn(() => 0)
}));

// Mock phosphor-svelte icons to prevent ES module import issues
vi.mock('phosphor-svelte', () => {
  // Create a proper mock Svelte component
  const MockIcon = class {
    constructor() {
      this.$$ = {
        fragment: null,
        ctx: [],
        callbacks: {},
        dirty: () => {},
        bound: {},
        update: () => {},
        before_update: [],
        after_update: [],
        context: new Map(),
        on_mount: [],
        on_destroy: [],
        skip_bound: false
      };
    }

    $destroy() {}
    $on() {
      return () => {};
    }
    $set() {}
  };

  return {
    Lock: MockIcon,
    Shield: MockIcon,
    Certificate: MockIcon,
    Key: MockIcon,
    UserCheck: MockIcon,
    ShieldCheck: MockIcon,
    Fingerprint: MockIcon,
    DeviceMobile: MockIcon,
    Globe: MockIcon,
    CheckCircle: MockIcon,
    WarningCircle: MockIcon,
    User: MockIcon,
    Envelope: MockIcon,
    SmileyWink: MockIcon,
    Heart: MockIcon,
    Star: MockIcon,
    Settings: MockIcon
  };
});

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

// Mock ResizeObserver for SvelteFlow components
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    // Store callback for potential future use
    this.callback = callback;
  }

  private callback: ResizeObserverCallback;
}

global.ResizeObserver = MockResizeObserver as any;

// Mock IntersectionObserver for components that need it
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  private callback: IntersectionObserverCallback;
}

global.IntersectionObserver = MockIntersectionObserver as any;

// Mock MutationObserver for components that need it
class MockMutationObserver {
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(callback: MutationCallback) {
    this.callback = callback;
  }

  private callback: MutationCallback;
}

global.MutationObserver = MockMutationObserver as any;

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

// Mock getComputedStyle for layout calculations
global.getComputedStyle = vi.fn(() => ({
  getPropertyValue: vi.fn(() => ''),
  width: '0px',
  height: '0px'
}));

// Mock getBoundingClientRect for layout calculations
Element.prototype.getBoundingClientRect = vi.fn(() => ({
  width: 400,
  height: 300,
  top: 0,
  left: 0,
  bottom: 300,
  right: 400,
  x: 0,
  y: 0,
  toJSON: vi.fn()
}));

// Mock HTMLElement methods that SvelteFlow might use
HTMLElement.prototype.scrollIntoView = vi.fn();
HTMLElement.prototype.focus = vi.fn();
HTMLElement.prototype.blur = vi.fn();

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
      listeners.forEach((listener) => {
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
beforeAll(async () => {
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
