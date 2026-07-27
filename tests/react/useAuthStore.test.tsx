/**
 * Tests for the React store adapter (src/core/stores/adapters/react.ts) and
 * the useAuthStore() hook (src/react/hooks/useAuthStore.ts).
 *
 * Mirrors tests/stores/svelte-adapter.test.ts's mocking approach (API client,
 * WebAuthn, session/storage managers) so a ComposedAuthStore can be created
 * without hitting real network/storage APIs. Placed under tests/react/ rather
 * than co-located under src/react/hooks/ to match this repo's actual test
 * layout (tests/stores/svelte-adapter.test.ts is likewise not co-located with
 * src/svelte/adapters/svelte.ts).
 */
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeToComposedAuthStore } from '../../src/core/stores/adapters/react.js';
import { createAuthStore } from '../../src/core/stores/index.js';
import { AuthStoreContext } from '../../src/react/context.js';
import { useAuthStore } from '../../src/react/hooks/useAuthStore.js';
// Imported via the package self-reference (not a relative path) so this resolves
// to the exact same module identity the source uses internally - see
// tests/stores/svelte-adapter.test.ts for the same rationale.
import type { AuthConfig, ComposedAuthStore } from '@thepia/flows-auth';

vi.mock('../../src/core/api/auth-api', () => ({
  // NOTE: must be a real `function`, not an arrow, so `new AuthApiClient()` works
  // under Vitest 4's stricter mock-constructor semantics.
  AuthApiClient: vi.fn().mockImplementation(function () {
    return {
      checkEmail: vi.fn().mockResolvedValue({
        exists: true,
        hasWebAuthn: false,
        hasValidPin: false,
        pinRemainingMinutes: 0
      }),
      sendAppEmailCode: vi.fn().mockResolvedValue({
        success: true,
        message: 'Code sent'
      }),
      verifyAppEmailCode: vi.fn().mockResolvedValue({
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01'
        },
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600
      })
    };
  })
}));

vi.mock('../../src/core/utils/webauthn', () => ({
  authenticateWithPasskey: vi.fn(),
  serializeCredential: vi.fn(),
  isWebAuthnSupported: vi.fn(() => true),
  isConditionalMediationSupported: vi.fn(() => true),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true))
}));

vi.mock('../../src/core/utils/sessionManager', () => ({
  configureSessionStorage: vi.fn(),
  getOptimalSessionConfig: vi.fn(() => ({ type: 'sessionStorage' }))
}));

let mockStorage: Record<string, string> = {};

vi.mock('../../src/core/utils/storageManager', () => ({
  getStorageManager: vi.fn(() => ({
    getItem: vi.fn((key: string) => mockStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
    }),
    clear: vi.fn(() => {
      mockStorage = {};
    }),
    getConfig: vi.fn(() => ({ type: 'sessionStorage' })),
    getSessionTimeout: vi.fn(() => 8 * 60 * 60 * 1000)
  }))
}));

const mockConfig: AuthConfig = {
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  enablePasskeys: true,
  appCode: 'test-app'
};

describe('subscribeToComposedAuthStore', () => {
  let store: ComposedAuthStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {};
    localStorage.clear();
    sessionStorage.clear();
    store = createAuthStore(mockConfig);
  });

  it('fires on a core-store change', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToComposedAuthStore(store, listener);

    store.core.setState({ passkeysEnabled: true });

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('fires on an onboarding-store change (the sub-store the Svelte adapter omits)', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToComposedAuthStore(store, listener);

    store.onboarding.setState({ loading: true });

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('tears down all 8 sub-store subscriptions on unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToComposedAuthStore(store, listener);
    unsubscribe();

    store.core.setState({ passkeysEnabled: true });
    store.onboarding.setState({ loading: true });

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('useAuthStore()', () => {
  let store: ComposedAuthStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {};
    localStorage.clear();
    sessionStorage.clear();
    store = createAuthStore(mockConfig);
  });

  it('re-renders when the core sub-store changes', () => {
    const { result } = renderHook(() => useAuthStore(store));

    const initial = result.current.passkeysEnabled;

    act(() => {
      store.core.setState({ passkeysEnabled: !initial });
    });

    expect(result.current.passkeysEnabled).toBe(!initial);
  });

  it('re-renders when the onboarding sub-store changes', () => {
    const { result } = renderHook(() => useAuthStore(store));

    act(() => {
      store.onboarding.setState({ loading: true });
    });

    // `onboarding.loading` isn't part of the flattened AuthStore snapshot,
    // but the change must still be observable through `.store` -- proving
    // the hook actually re-rendered off the onboarding sub-store (not just
    // core/ui/error, which is all getState() reads).
    expect(result.current.store.onboarding.getState().loading).toBe(true);
  });

  it('exposes both flattened state and action methods', () => {
    const { result } = renderHook(() => useAuthStore(store));

    expect(typeof result.current.signInWithPasskey).toBe('function');
    expect(result.current.email).toBe('');
    expect(result.current.signInState).toBe('emailEntry');
  });

  it('prefers an explicit store prop over context', () => {
    const contextStore = createAuthStore({ ...mockConfig, clientId: 'context-client' });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthStoreContext.Provider value={contextStore}>{children}</AuthStoreContext.Provider>
    );

    const { result } = renderHook(() => useAuthStore(store), { wrapper });

    expect(result.current.getConfig().clientId).toBe('test-client');
  });

  it('falls back to context when no store prop is given', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthStoreContext.Provider value={store}>{children}</AuthStoreContext.Provider>
    );

    const { result } = renderHook(() => useAuthStore(), { wrapper });

    expect(result.current.getConfig().clientId).toBe('test-client');
  });

  it('throws when neither a store prop nor context is available', () => {
    expect(() => renderHook(() => useAuthStore())).toThrow(/Auth store not found/);
  });
});
