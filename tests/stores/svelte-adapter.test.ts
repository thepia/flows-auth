/**
 * Tests for Svelte Store Adapter
 *
 * Ensures the adapter properly:
 * 1. Provides subscribe method for reactive $store syntax
 * 2. Exposes all expected methods
 * 3. Maintains reactivity with underlying stores
 * 4. Is compatible with Svelte components
 */

import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore, makeSvelteCompatible } from '../../src/stores';
import type { AuthConfig } from '../../src/types';

// Mock external dependencies
vi.mock('../../src/api/auth-api', () => ({
  AuthApiClient: vi.fn().mockImplementation(() => ({
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
  }))
}));

vi.mock('../../src/utils/webauthn', () => ({
  authenticateWithPasskey: vi.fn(),
  serializeCredential: vi.fn(),
  isWebAuthnSupported: vi.fn(() => true),
  isConditionalMediationSupported: vi.fn(() => true),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true))
}));

let mockSessionData: any = null;
vi.mock('../../src/utils/sessionManager', () => ({
  configureSessionStorage: vi.fn(),
  getOptimalSessionConfig: vi.fn(() => ({ type: 'sessionStorage' })),
  getSession: vi.fn(() => mockSessionData),
  getCurrentSession: vi.fn(() => mockSessionData),
  isSessionValid: vi.fn((session) => !!session && session.tokens?.expiresAt > Date.now()),
  saveSession: vi.fn((data) => {
    mockSessionData = data;
  }),
  clearSession: vi.fn(() => {
    mockSessionData = null;
  }),
  generateInitials: vi.fn((name: string) => name.charAt(0).toUpperCase())
}));

const mockConfig: AuthConfig = {
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  enablePasskeys: true,
  enableMagicLinks: true,
  appCode: 'test-app'
};

describe('Svelte Store Adapter', () => {
  let store: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionData = null;
    const baseStore = createAuthStore(mockConfig);
    store = makeSvelteCompatible(baseStore);
  });

  describe('Svelte Store Contract', () => {
    it('should have a subscribe method', () => {
      expect(typeof store.subscribe).toBe('function');
    });

    it('should work with svelte get() helper', () => {
      const state = get(store);
      expect(state).toBeDefined();
      expect(state.state).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.signInState).toBe('emailEntry');
    });

    it('should implement proper Svelte store contract for component usage', async () => {
      // Test that the store can be used exactly like Svelte components expect
      let subscriptionCallCount = 0;
      let lastReceivedState: any = null;

      // Subscribe like a Svelte component would
      const unsubscribe = store.subscribe((state: any) => {
        subscriptionCallCount++;
        lastReceivedState = state;
      });

      // Should call immediately with current state (Svelte requirement)
      expect(subscriptionCallCount).toBe(1);
      expect(lastReceivedState).toBeDefined();
      expect(lastReceivedState.signInState).toBe('emailEntry');

      // Should update when state changes (setEmail triggers user check which causes multiple updates)
      store.setEmail('component@test.com');

      // Wait for async user check to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should have updated (initial + email change + user check result)
      expect(subscriptionCallCount).toBeGreaterThan(1);
      expect(lastReceivedState.email).toBe('component@test.com');

      // Should work with Svelte's get() function
      const currentState = get(store);
      expect(currentState.email).toBe('component@test.com');
      expect(currentState.signInState).toBe(lastReceivedState.signInState);

      // Cleanup
      unsubscribe();

      // Should not call after unsubscribe
      const previousCallCount = subscriptionCallCount;
      store.setEmail('after@unsubscribe.com');
      expect(subscriptionCallCount).toBe(previousCallCount);
    });

    it('should be reactive when state changes', () => {
      let capturedState: any;
      const unsubscribe = store.subscribe((state: any) => {
        capturedState = state;
      });

      // Initial state
      expect(capturedState.email).toBe('');

      // Change email
      store.setEmail('test@example.com');

      // Should update reactively
      expect(capturedState.email).toBe('test@example.com');

      unsubscribe();
    });

    it('should support multiple subscribers', () => {
      let state1: any;
      let state2: any;

      const unsub1 = store.subscribe((s: any) => {
        state1 = s;
      });
      const unsub2 = store.subscribe((s: any) => {
        state2 = s;
      });

      // Both should get initial state
      expect(state1.signInState).toBe('emailEntry');
      expect(state2.signInState).toBe('emailEntry');

      // Update state
      store.setEmail('multi@test.com');

      // Both should update
      expect(state1.email).toBe('multi@test.com');
      expect(state2.email).toBe('multi@test.com');

      unsub1();
      unsub2();
    });
  });

  describe('Configuration Methods', () => {
    it('should provide getConfig method', () => {
      expect(typeof store.getConfig).toBe('function');
      const config = store.getConfig();
      expect(config).toEqual(mockConfig);
    });
  });

  describe('Authentication Methods', () => {
    it('should provide signInWithPasskey method', () => {
      expect(typeof store.signInWithPasskey).toBe('function');
    });

    it('should provide verifyEmailCode method', () => {
      expect(typeof store.verifyEmailCode).toBe('function');
    });

    it('should provide signOut method', () => {
      expect(typeof store.signOut).toBe('function');
    });

    it('should handle email sign-in flow', async () => {
      // Set email
      store.setEmail('test@example.com');

      // Wait for reactive update
      await new Promise((resolve) => setTimeout(resolve, 1));

      let state = get(store);
      expect(state.email).toBe('test@example.com');

      // Send code
      await store.sendEmailCode('test@example.com');

      state = get(store);
      expect(state.emailCodeSent).toBe(true);
    });
  });

  describe('User Management Methods', () => {
    it('should provide checkUser method', () => {
      expect(typeof store.checkUser).toBe('function');
    });

    it('should provide setEmail method', async () => {
      expect(typeof store.setEmail).toBe('function');
      store.setEmail('new@example.com');

      // Wait for reactive update
      await new Promise((resolve) => setTimeout(resolve, 1));

      const state = get(store);
      expect(state.email).toBe('new@example.com');
    });

    it('should provide setFullName method', async () => {
      expect(typeof store.setFullName).toBe('function');
      store.setFullName('John Doe');

      // Wait for reactive update
      await new Promise((resolve) => setTimeout(resolve, 1));

      const state = get(store);
      expect(state.fullName).toBe('John Doe');
    });

    it('should automatically check user when valid email is set', async () => {
      store.setEmail('auto@check.com');

      // Wait for async check
      await new Promise((resolve) => setTimeout(resolve, 10));

      const state = get(store);
      expect(state.userExists).toBe(true);
    });
  });

  describe('State Query Methods', () => {
    it('should provide isAuthenticated method', () => {
      expect(typeof store.isAuthenticated).toBe('function');
      expect(store.isAuthenticated()).toBe(false);
    });

    it('should provide getAccessToken method', () => {
      expect(typeof store.getAccessToken).toBe('function');
      expect(store.getAccessToken()).toBeNull();
    });

    it('should provide user access through getState', () => {
      const state = store.getState();
      expect(state.user).toBeNull();
    });

    it('should provide getState method for direct access', () => {
      expect(typeof store.getState).toBe('function');
      const state = store.getState();
      expect(state).toBeDefined();
      expect(state.state).toBe('unauthenticated');
    });
  });

  describe('Loading State Management', () => {
    it('should provide setLoading method', async () => {
      expect(typeof store.setLoading).toBe('function');

      let state = get(store);
      expect(state.loading).toBe(false);

      store.setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1));
      state = get(store);
      expect(state.loading).toBe(true);

      store.setLoading(false);
      await new Promise((resolve) => setTimeout(resolve, 1));
      state = get(store);
      expect(state.loading).toBe(false);
    });
  });

  describe('Event System Compatibility', () => {
    it('should provide sendSignInEvent method for legacy compatibility', () => {
      expect(typeof store.sendSignInEvent).toBe('function');
    });

    it('should handle SET_EMAIL event', async () => {
      store.sendSignInEvent({ type: 'SET_EMAIL', email: 'event@test.com' });

      // Wait for reactive update
      await new Promise((resolve) => setTimeout(resolve, 1));

      const state = get(store);
      expect(state.email).toBe('event@test.com');
    });

    it('should handle SET_FULL_NAME event', async () => {
      store.sendSignInEvent({ type: 'SET_FULL_NAME', fullName: 'Event Name' });

      // Wait for reactive update
      await new Promise((resolve) => setTimeout(resolve, 1));

      const state = get(store);
      expect(state.fullName).toBe('Event Name');
    });

    it('should provide on method for event subscriptions', () => {
      expect(typeof store.on).toBe('function');

      let eventReceived = false;
      const unsubscribe = store.on('sign_in_success', () => {
        eventReceived = true;
      });

      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('State Management', () => {
    it('should provide reset method', async () => {
      expect(typeof store.reset).toBe('function');

      // Set some state
      store.setEmail('reset@test.com');
      store.setFullName('Reset User');

      // Wait for state updates
      await new Promise((resolve) => setTimeout(resolve, 1));

      let state = get(store);
      expect(state.email).toBe('reset@test.com');
      expect(state.fullName).toBe('Reset User');

      // Reset
      store.reset();

      // Wait for reset
      await new Promise((resolve) => setTimeout(resolve, 1));

      state = get(store);
      expect(state.email).toBe('');
      expect(state.fullName).toBe('');
      expect(state.signInState).toBe('emailEntry');
    });

    it('should provide destroy method', () => {
      expect(typeof store.destroy).toBe('function');

      store.setEmail('destroy@test.com');
      store.destroy();

      const state = get(store);
      expect(state.email).toBe('');
    });
  });

  describe('Advanced Store Access', () => {
    it('should provide access to store methods and state', () => {
      // The store should provide all necessary methods without exposing internals
      expect(typeof store.getState).toBe('function');
      expect(typeof store.setEmail).toBe('function');
      expect(typeof store.setLoading).toBe('function');
      expect(typeof store.getConfig).toBe('function');
    });
  });

  describe('State Synchronization', () => {
    it('should sync all store states in reactive state', () => {
      const state = get(store);

      // Should have core state
      expect(state.state).toBeDefined();
      expect(state.user).toBeDefined();
      expect(state.access_tokenn).toBeDefined();

      // Should have UI state
      expect(state.signInState).toBeDefined();
      expect(state.email).toBeDefined();
      expect(state.fullName).toBeDefined();
      expect(state.userExists).toBeDefined();

      // Should have loading state
      expect(state.loading).toBeDefined();

      // Should have error state (apiError, not error)
      expect(state.apiError).toBeDefined();

      // Should have config through getConfig method
      expect(store.getConfig()).toEqual(mockConfig);
    });

    it('should update reactive state when store methods are called', async () => {
      let state = get(store);
      expect(state.loading).toBe(false);

      // Change loading through store method
      store.setLoading(true);

      // Wait for reactive update
      await new Promise((resolve) => setTimeout(resolve, 1));

      // Should reflect in reactive state
      state = get(store);
      expect(state.loading).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing component usage', () => {
      // All methods that existing components expect should be present
      const expectedMethods = [
        'subscribe',
        'getConfig',
        'signInWithPasskey',
        'sendEmailCode',
        'verifyEmailCode',
        'signOut',
        'checkUser',
        'setEmail',
        'setFullName',
        'isAuthenticated',
        'getAccessToken',
        'setLoading',
        'sendSignInEvent',
        'on',
        'reset',
        'getState',
        'destroy'
      ];

      for (const method of expectedMethods) {
        expect(typeof store[method]).toBe('function', `Missing method: ${method}`);
      }
    });
  });
});
