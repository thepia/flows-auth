/**
 * Comprehensive tests for auth store reset() method
 * Tests both the reset() method and RESET event handling
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig, SignInData } from '../../src/types';
import {
  clearSession,
  getSession,
  saveSession
} from '../../src/utils/sessionManager';

// Mock the API client
vi.mock('../../src/api/auth-api');

// Mock WebAuthn utilities
vi.mock('../../src/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn(() => false),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false))
}));

describe('Auth Store reset() Method', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let mockApiClient: any;
  let config: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    clearSession(); // Ensure clean session state

    // Create mock API client
    mockApiClient = {
      checkEmail: vi.fn().mockResolvedValue({
        exists: true,
        hasWebAuthn: false,
        emailVerified: true,
        lastPinExpiry: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      }),
      sendAppEmailCode: vi.fn().mockResolvedValue({
        success: true,
        message: 'PIN sent',
        timestamp: Date.now()
      })
    };

    config = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test',
      domain: 'test.com',
      enablePasskeys: false,
      enableMagicLinks: false,
      appCode: 'test',
      signInMode: 'login-or-register'
    };

    authStore = createAuthStore(config, mockApiClient);
  });

  describe('reset() method behavior', () => {
    it('should reset all UI state to initial values', async () => {
      // Setup: Set various UI states
      authStore.setEmail('test@example.com');
      authStore.setFullName('Test User');
      authStore.setLoading(true);
      authStore.setEmailCodeSent(true);

      // Verify states are set
      const beforeReset = authStore.getState();
      expect(beforeReset.email).toBe('test@example.com');
      expect(beforeReset.fullName).toBe('Test User');
      expect(beforeReset.loading).toBe(true);
      expect(beforeReset.emailCodeSent).toBe(true);

      // Act: Call reset()
      authStore.reset();

      // Assert: All UI state should be cleared
      const afterReset = authStore.getState();
      expect(afterReset.email).toBe('');
      expect(afterReset.fullName).toBe('');
      expect(afterReset.loading).toBe(false);
      expect(afterReset.emailCodeSent).toBe(false);
    });

    it('should reset user discovery state', async () => {
      // Setup: Check user to populate discovery state
      await authStore.checkUser('test@example.com');

      const beforeReset = authStore.getState();
      expect(beforeReset.userExists).toBe(true);
      expect(beforeReset.hasValidPin).toBe(true);
      expect(beforeReset.pinRemainingMinutes).toBeGreaterThan(0);

      // Act: Reset
      authStore.reset();

      // Assert: Discovery state cleared
      const afterReset = authStore.getState();
      expect(afterReset.userExists).toBeNull();
      expect(afterReset.hasPasskeys).toBe(false);
      expect(afterReset.hasValidPin).toBe(false);
      expect(afterReset.pinRemainingMinutes).toBe(0);
    });

    it('should reset authentication state', () => {
      // Setup: Simulate authentication via PIN_VERIFIED event
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });
      authStore.notifyPinSent();
      const sessionData: SignInData = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          initials: ''
        },
        authMethod: 'email-code',
        lastActivity: Date.now(),
        // authMethod: 'passkey' | 'password' | 'email-code' | 'magic-link';
        // lastActivity: number;

        tokens: {
          accessToken: 'test-token',
          refreshToken: 'test-refresh',
          expiresAt: Date.now() + 3600000
        }
      };
      authStore.notifyPinVerified(sessionData);

      // Verify authenticated
      const beforeReset = authStore.getState();
      expect(beforeReset.state).toBe('authenticated');
      expect(beforeReset.user).toBeDefined();

      // Act: Reset
      authStore.reset();

      // Assert: Authentication cleared
      const afterReset = authStore.getState();
      expect(afterReset.state).toBe('unauthenticated');
      expect(afterReset.user).toBeNull();
      expect(afterReset.accessToken).toBeNull();
      expect(afterReset.refreshToken).toBeNull();
      expect(afterReset.expiresAt).toBeNull();
    });

    it('should clear session storage', () => {
      // Setup: Create a session
      const sessionData: SignInData = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          initials: ''
        },
        authMethod: 'email-code',
        lastActivity: Date.now(),
        // authMethod: 'passkey' | 'password' | 'email-code' | 'magic-link';
        // lastActivity: number;

        tokens: {
          accessToken: 'test-token',
          refreshToken: 'test-refresh',
          expiresAt: Date.now() + 3600000
        }
      };
      saveSession(sessionData);

      // Verify session exists
      expect(getSession()).toBeDefined();

      // Act: Reset
      authStore.reset();

      // Assert: Session cleared
      expect(getSession()).toBeNull();
    });

    it('should reset signInState to emailEntry', async () => {
      // Setup: Progress through various states
      await authStore.checkUser('test@example.com');
      authStore.notifyPinSent();

      const beforeReset = authStore.getState();
      expect(beforeReset.signInState).toBe('pinEntry');

      // Act: Reset
      authStore.reset();

      // Assert: Back to emailEntry
      const afterReset = authStore.getState();
      expect(afterReset.signInState).toBe('emailEntry');
    });

    it('should clear API errors', () => {
      // Setup: Set an API error using store method
      const testError = new Error('Test error');
      authStore.setApiError(testError, { method: 'test' });

      const beforeReset = authStore.getState();
      expect(beforeReset.apiError).toBeDefined();

      // Act: Reset
      authStore.reset();

      // Assert: Error cleared
      const afterReset = authStore.getState();
      expect(afterReset.apiError).toBeNull();
    });
  });

  describe('RESET event vs reset() method', () => {
    it('should have same effect whether using reset() or RESET event', () => {
      // Setup: Set various states
      authStore.setEmail('test@example.com');
      authStore.setFullName('Test User');
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });

      const afterSetup = authStore.getState();
      expect(afterSetup.email).toBe('test@example.com');
      expect(afterSetup.signInState).toBe('userChecked');

      // Method 1: Use reset() method
      authStore.reset();
      const afterResetMethod = authStore.getState();

      // Setup again for comparison
      authStore.setEmail('test@example.com');
      authStore.setFullName('Test User');
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });

      // Method 2: Use RESET event
      authStore.sendSignInEvent({ type: 'RESET' });
      const afterResetEvent = authStore.getState();

      // Assert: Both should have same result
      expect(afterResetMethod.signInState).toBe('emailEntry');
      expect(afterResetEvent.signInState).toBe('emailEntry');
      expect(afterResetMethod.email).toBe('');
      expect(afterResetEvent.email).toBe('');
      expect(afterResetMethod.fullName).toBe('');
      expect(afterResetEvent.fullName).toBe('');
    });
  });

  describe('reset() in different states', () => {
    it('should work from emailEntry state', () => {
      const initial = authStore.getState();
      expect(initial.signInState).toBe('emailEntry');

      authStore.reset();

      const afterReset = authStore.getState();
      expect(afterReset.signInState).toBe('emailEntry');
    });

    it('should work from userChecked state', () => {
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });

      expect(authStore.getState().signInState).toBe('userChecked');

      authStore.reset();

      expect(authStore.getState().signInState).toBe('emailEntry');
    });

    it('should work from pinEntry state', async () => {
      // Get to pinEntry state
      await authStore.checkUser('test@example.com');
      authStore.notifyPinSent();

      expect(authStore.getState().signInState).toBe('pinEntry');

      authStore.reset();

      const afterReset = authStore.getState();
      expect(afterReset.signInState).toBe('emailEntry');
      expect(afterReset.emailCodeSent).toBe(false);
    });

    it('should work from signedIn state', () => {
      // Simulate signed in state
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });
      authStore.notifyPinSent();
      authStore.sendSignInEvent({
        type: 'PIN_VERIFIED',
        session: {
          accessToken: 'test-token',
          refreshToken: 'test-refresh',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true
          },
          expiresAt: Date.now() + 3600000,
          lastActivity: Date.now()
        }
      });

      expect(authStore.getState().signInState).toBe('signedIn');

      authStore.reset();

      expect(authStore.getState().signInState).toBe('emailEntry');
    });

    it('should work from error states', () => {
      // Get to generalError state
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: true
      });
      // Simulate passkey prompt then failure
      authStore.sendSignInEvent({
        type: 'PASSKEY_FAILED',
        error: {
          name: 'NotAllowedError',
          message: 'User cancelled',
          timing: 1000,
          type: 'user-cancelled'
        }
      });

      expect(authStore.getState().signInState).toBe('generalError');

      authStore.reset();

      expect(authStore.getState().signInState).toBe('emailEntry');
    });
  });

  describe('reset() idempotency', () => {
    it('should be safe to call multiple times', () => {
      // Setup some state
      authStore.setEmail('test@example.com');
      authStore.setFullName('Test User');

      // Call reset multiple times
      authStore.reset();
      const firstReset = authStore.getState();

      authStore.reset();
      const secondReset = authStore.getState();

      authStore.reset();
      const thirdReset = authStore.getState();

      // All should have same clean state
      expect(firstReset.signInState).toBe('emailEntry');
      expect(secondReset.signInState).toBe('emailEntry');
      expect(thirdReset.signInState).toBe('emailEntry');

      expect(firstReset.email).toBe('');
      expect(secondReset.email).toBe('');
      expect(thirdReset.email).toBe('');
    });
  });

  describe('reset() preserves configuration', () => {
    it('should not reset store configuration', () => {
      const initialConfig = authStore.getConfig();

      authStore.reset();

      const afterResetConfig = authStore.getConfig();

      // Config should be unchanged
      expect(afterResetConfig).toEqual(initialConfig);
      expect(afterResetConfig.apiBaseUrl).toBe('https://api.test.com');
      expect(afterResetConfig.appCode).toBe('test');
      expect(afterResetConfig.enablePasskeys).toBe(false);
    });

    it('should preserve passkeysEnabled determination', () => {
      const initial = authStore.getState();
      const initialPasskeysEnabled = initial.passkeysEnabled;

      authStore.reset();

      const afterReset = authStore.getState();
      expect(afterReset.passkeysEnabled).toBe(initialPasskeysEnabled);
    });
  });
});
