/**
 * Global auth store singleton (src/core/stores/global-auth-store.ts).
 *
 * Covers the singleton contract that consumers rely on: one instance per app,
 * idempotent init, an explicit "already initialized with a different config"
 * guard, a throw-before-init, and a clean reset. This is new auth-critical
 * public API (src/core/stores/**) and was previously untested.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGlobalAuthStore,
  initializeAuth,
  isAuthStoreInitialized,
  resetGlobalAuthStore
} from '../../src/core/stores/global-auth-store.js';
import type { AuthConfig } from '../../src/core/types/index.js';

const BASE_CONFIG: AuthConfig = {
  apiBaseUrl: 'https://api.test.com',
  clientId: 'deprecated-field',
  domain: 'test.auth0.com',
  appCode: 'test-app',
  enablePasskeys: true,
  signInMode: 'login-or-register',
  language: 'en'
};

// A lightweight API-client stub so no real client / network is constructed.
const apiClientStub = {
  checkEmail: vi.fn().mockResolvedValue({ exists: false, hasWebAuthn: false }),
  sendAppEmailCode: vi.fn().mockResolvedValue({ success: true })
} as any;

function init(config: Partial<AuthConfig> = {}) {
  return initializeAuth({ ...BASE_CONFIG, ...config }, apiClientStub);
}

describe('global auth store singleton', () => {
  // Isolate every test: the singleton is module-level state.
  beforeEach(() => resetGlobalAuthStore());
  afterEach(() => resetGlobalAuthStore());

  it('getGlobalAuthStore() throws before initializeAuth()', () => {
    expect(isAuthStoreInitialized()).toBe(false);
    expect(() => getGlobalAuthStore()).toThrow(/not initialized/i);
  });

  it('initializeAuth() creates a store and flips isAuthStoreInitialized()', () => {
    expect(isAuthStoreInitialized()).toBe(false);
    const store = init();
    expect(isAuthStoreInitialized()).toBe(true);
    // A real ComposedAuthStore: cleanup hook + the composed sub-stores. (`subscribe`
    // is not here -- that's added by makeSvelteCompatible on the ./svelte adapter.)
    expect(typeof store.destroy).toBe('function');
    expect(store.core).toBeDefined();
    expect(store.session).toBeDefined();
  });

  it('getGlobalAuthStore() returns the exact instance initializeAuth() created', () => {
    const created = init();
    expect(getGlobalAuthStore()).toBe(created);
  });

  it('re-initializing with an equivalent config is a no-op returning the same instance (no warning)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = init();
    // Same compared fields -> treated as equivalent even though a non-compared
    // field (language) differs.
    const second = init({ language: 'da' });
    expect(second).toBe(first);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('re-initializing with a DIFFERENT config warns and keeps the original instance', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = init();
    const second = init({ appCode: 'other-app' });
    expect(second).toBe(first); // original kept, not replaced
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/already initialized with a different config/i);
    warn.mockRestore();
  });

  it('resetGlobalAuthStore() destroys the store and returns to the uninitialized state', () => {
    const store = init();
    const destroy = vi.spyOn(store, 'destroy');
    resetGlobalAuthStore();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(isAuthStoreInitialized()).toBe(false);
    expect(() => getGlobalAuthStore()).toThrow(/not initialized/i);
  });

  it('after reset, initializeAuth() builds a fresh instance (reconfigure path)', () => {
    const first = init();
    resetGlobalAuthStore();
    const second = init({ appCode: 'other-app' });
    expect(second).not.toBe(first);
    expect(getGlobalAuthStore()).toBe(second);
  });
});
