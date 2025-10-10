/**
 * Tests for consolidated PIN notification logic
 * Verifies notifyPinSent, PIN_VERIFIED, and EMAIL_VERIFIED events
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig, SignInData, SignInResponse } from '../../src/types';

// Mock the API client
vi.mock('../../src/api/auth-api');

describe('Auth Store PIN Notification', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let mockApiClient: any;
  let config: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock API client
    mockApiClient = {
      checkEmail: vi.fn().mockResolvedValue({
        exists: true,
        hasWebAuthn: false,
        emailVerified: false,
        lastPinExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
      }),
      sendAppEmailCode: vi.fn().mockResolvedValue({
        success: true,
        message: 'PIN sent',
        timestamp: Date.now()
      }),
      verifyAppEmailCode: vi.fn().mockResolvedValue({
        step: 'success',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true
        },
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600
      } as SignInResponse)
    };

    config = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test',
      domain: 'test.com',
      enablePasskeys: false,
      enableMagicLinks: false,
      appCode: 'test'
    };

    authStore = createAuthStore(config, mockApiClient);
  });

  describe('notifyPinSent method', () => {
    it('should set emailCodeSent to true and transition state', async () => {
      // Setup: Get to userChecked state first
      await authStore.checkUser('test@example.com');

      const beforeState = authStore.getState();
      expect(beforeState.signInState).toBe('userChecked');
      expect(beforeState.emailCodeSent).toBe(false);

      // Act: Call consolidated notifyPinSent
      const newState = authStore.notifyPinSent();

      // Assert: Check both effects happened
      const afterState = authStore.getState();
      expect(afterState.emailCodeSent).toBe(true);
      expect(afterState.signInState).toBe('pinEntry');
      expect(newState).toBe('pinEntry'); // Return value should be new state
    });

    it('should work when user has existing valid PIN', async () => {
      // Setup: User with valid existing PIN
      await authStore.checkUser('test@example.com');

      const beforeState = authStore.getState();
      expect(beforeState.hasValidPin).toBe(true);
      expect(beforeState.pinRemainingMinutes).toBeGreaterThan(0);

      // Act: Notify PIN sent (even though we're using existing PIN)
      authStore.notifyPinSent();

      // Assert: Should still transition to pinEntry
      const afterState = authStore.getState();
      expect(afterState.emailCodeSent).toBe(true);
      expect(afterState.signInState).toBe('pinEntry');
    });

    it('should be idempotent when called multiple times', () => {
      // Setup: Get to userChecked state
      authStore.setEmail('test@example.com');
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });

      // Act: Call notifyPinSent multiple times
      authStore.notifyPinSent();
      const firstState = authStore.getState();

      authStore.notifyPinSent();
      const secondState = authStore.getState();

      // Assert: State should remain stable
      expect(firstState.signInState).toBe('pinEntry');
      expect(secondState.signInState).toBe('pinEntry');
      expect(firstState.emailCodeSent).toBe(true);
      expect(secondState.emailCodeSent).toBe(true);
    });
  });

  describe('PIN_VERIFIED event', () => {
    it('should transition from pinEntry to signedIn', () => {
      // Setup: Get to pinEntry state
      authStore.setEmail('test@example.com');
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });
      authStore.notifyPinSent();

      expect(authStore.getState().signInState).toBe('pinEntry');

      // Act: Send PIN_VERIFIED event
      const sessionData: SignInData = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU'
        },
        tokens: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expiresAt: Date.now() + 3600000
        },
        authMethod: 'email-code',
        lastActivity: Date.now()
      };

      authStore.sendSignInEvent({ type: 'PIN_VERIFIED', session: sessionData });

      // Assert: Should be signed in
      const afterState = authStore.getState();
      expect(afterState.signInState).toBe('signedIn');
    });

    it('should not transition from wrong states', () => {
      // Setup: Start in emailEntry state
      const initialState = authStore.getState();
      expect(initialState.signInState).toBe('emailEntry');

      // Act: Try to send PIN_VERIFIED from wrong state
      const sessionData: SignInData = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU'
        },
        tokens: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expiresAt: Date.now() + 3600000
        },
        authMethod: 'email-code',
        lastActivity: Date.now()
      };

      authStore.sendSignInEvent({ type: 'PIN_VERIFIED', session: sessionData });

      // Assert: Should remain in emailEntry (no transition)
      expect(authStore.getState().signInState).toBe('emailEntry');
    });
  });

  describe('EMAIL_VERIFIED event', () => {
    it('should transition from pinEntry to signedIn via EMAIL_VERIFIED', () => {
      // Setup: Get to pinEntry state (current flow)
      authStore.setEmail('test@example.com');
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });
      authStore.notifyPinSent();

      expect(authStore.getState().signInState).toBe('pinEntry');

      // Act: Send EMAIL_VERIFIED event (successful PIN verification)
      const sessionData: SignInData = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU'
        },
        tokens: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expiresAt: Date.now() + 3600000
        },
        authMethod: 'email-code',
        lastActivity: Date.now()
      };

      authStore.sendSignInEvent({ type: 'EMAIL_VERIFIED', session: sessionData });

      // Assert: Should be signed in
      expect(authStore.getState().signInState).toBe('signedIn');
    });

    it.skip('should not transition from pinEntry (wrong state) - DEPRECATED: EMAIL_VERIFIED now works from pinEntry', () => {
      // Setup: Get to pinEntry state
      authStore.setEmail('test@example.com');
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });
      authStore.notifyPinSent();

      expect(authStore.getState().signInState).toBe('pinEntry');

      // Act: Try EMAIL_VERIFIED from pinEntry (should not work)
      const sessionData: SignInData = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU'
        },
        tokens: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expiresAt: Date.now() + 3600000
        },
        authMethod: 'email-code',
        lastActivity: Date.now()
      };

      authStore.sendSignInEvent({ type: 'EMAIL_VERIFIED', session: sessionData });

      // Assert: Should remain in pinEntry
      expect(authStore.getState().signInState).toBe('pinEntry');
    });
  });

  describe('verifyEmailCode integration', () => {
    it('should send PIN_VERIFIED event after successful verification', async () => {
      // Setup: Get to pinEntry state
      authStore.setEmail('test@example.com');
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });
      authStore.notifyPinSent();

      // Act: Verify email code
      await authStore.verifyEmailCode('123456');

      // Assert: Should transition to signedIn via PIN_VERIFIED
      const afterState = authStore.getState();
      expect(afterState.signInState).toBe('signedIn');
      expect(afterState.state).toBe('authenticated');
      expect(afterState.user).toBeDefined();
      expect(afterState.access_token).toBe('test-token');
    });

    it('should handle verification failure', async () => {
      // Setup: Mock API to fail
      mockApiClient.verifyAppEmailCode.mockRejectedValue(new Error('Invalid code'));

      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });
      expect(authStore.getState().signInState).toBe('userChecked');
      authStore.notifyPinSent();

      const beforeState = authStore.getState();
      expect(beforeState.signInState).toBe('pinEntry');

      // Configure mock to reject with error
      mockApiClient.verifyAppEmailCode.mockRejectedValueOnce(new Error('Invalid code'));

      // Act: Try to verify with wrong code
      await expect(authStore.verifyEmailCode('wrong')).rejects.toThrow('Invalid code');

      // Assert: Should remain in pinEntry
      const afterState = authStore.getState();
      expect(afterState.signInState).toBe('pinEntry');
      expect(afterState.state).toBe('unauthenticated');
    });
  });

  describe('Complete authentication flow', () => {
    it('should handle full PIN authentication flow', async () => {
      // 1. Start with email entry
      expect(authStore.getState().signInState).toBe('emailEntry');

      // 2. Check user
      await authStore.checkUser('test@example.com');
      expect(authStore.getState().signInState).toBe('userChecked');

      // 3. Send PIN (or use existing)
      authStore.notifyPinSent();
      expect(authStore.getState().signInState).toBe('pinEntry');
      expect(authStore.getState().emailCodeSent).toBe(true);

      // 4. Verify PIN
      await authStore.verifyEmailCode('123456');
      expect(authStore.getState().signInState).toBe('signedIn');
      expect(authStore.getState().state).toBe('authenticated');
    });

    it('should handle flow with existing valid PIN', async () => {
      // 1. Check user (has valid PIN)
      await authStore.checkUser('test@example.com');
      const userState = authStore.getState();
      expect(userState.hasValidPin).toBe(true);
      expect(userState.pinRemainingMinutes).toBeGreaterThan(0);

      // 2. Go directly to PIN entry (skip sending)
      authStore.notifyPinSent();
      expect(authStore.getState().signInState).toBe('pinEntry');

      // 3. Verify existing PIN
      await authStore.verifyEmailCode('123456');
      expect(authStore.getState().signInState).toBe('signedIn');
    });
  });
});
