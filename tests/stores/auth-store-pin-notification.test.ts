/**
 * Tests for consolidated PIN notification logic
 * Verifies notifyPinSent, PIN_VERIFIED, and EMAIL_VERIFIED events
 */

import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';
import { AuthApiClient } from '../../src/api/auth-api';
import type { AuthConfig, SignInResponse } from '../../src/types';

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
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresIn: 3600
      } as SignInResponse)
    };

    config = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test',
      domain: 'test.com',
      enablePasskeys: false,
      enableMagicPins: true,
      appCode: 'test'
    };

    authStore = createAuthStore(config, mockApiClient);
  });

  describe('notifyPinSent method', () => {
    it('should set emailCodeSent to true and transition state', async () => {
      // Setup: Get to userChecked state first
      await authStore.checkUser('test@example.com');

      const beforeState = get(authStore);
      expect(beforeState.signInState).toBe('userChecked');
      expect(beforeState.emailCodeSent).toBe(false);

      // Act: Call consolidated notifyPinSent
      const newState = authStore.notifyPinSent();

      // Assert: Check both effects happened
      const afterState = get(authStore);
      expect(afterState.emailCodeSent).toBe(true);
      expect(afterState.signInState).toBe('pinEntry');
      expect(newState).toBe('pinEntry'); // Return value should be new state
    });

    it('should work when user has existing valid PIN', async () => {
      // Setup: User with valid existing PIN
      await authStore.checkUser('test@example.com');

      const beforeState = get(authStore);
      expect(beforeState.hasValidPin).toBe(true);
      expect(beforeState.pinRemainingMinutes).toBeGreaterThan(0);

      // Act: Notify PIN sent (even though we're using existing PIN)
      authStore.notifyPinSent();

      // Assert: Should still transition to pinEntry
      const afterState = get(authStore);
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
      const firstState = get(authStore);

      authStore.notifyPinSent();
      const secondState = get(authStore);

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

      expect(get(authStore).signInState).toBe('pinEntry');

      // Act: Send PIN_VERIFIED event
      const sessionData = {
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
      };

      authStore.sendSignInEvent({ type: 'PIN_VERIFIED', session: sessionData });

      // Assert: Should be signed in
      const afterState = get(authStore);
      expect(afterState.signInState).toBe('signedIn');
    });

    it('should not transition from wrong states', () => {
      // Setup: Start in emailEntry state
      const initialState = get(authStore);
      expect(initialState.signInState).toBe('emailEntry');

      // Act: Try to send PIN_VERIFIED from wrong state
      const sessionData = {
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
      };

      authStore.sendSignInEvent({ type: 'PIN_VERIFIED', session: sessionData });

      // Assert: Should remain in emailEntry (no transition)
      expect(get(authStore).signInState).toBe('emailEntry');
    });
  });

  describe('EMAIL_VERIFIED event', () => {
    it('should transition from emailVerification to signedIn', () => {
      // Setup: Get to emailVerification state
      // This requires: emailEntry -> userChecked -> pinEntry -> emailVerification
      authStore.setEmail('test@example.com');
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });
      authStore.notifyPinSent();
      authStore.sendSignInEvent({ type: 'EMAIL_VERIFICATION_REQUIRED' });

      expect(get(authStore).signInState).toBe('emailVerification');

      // Act: Send EMAIL_VERIFIED event
      const sessionData = {
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
      };

      authStore.sendSignInEvent({ type: 'EMAIL_VERIFIED', session: sessionData });

      // Assert: Should be signed in
      expect(get(authStore).signInState).toBe('signedIn');
    });

    it('should not transition from pinEntry (wrong state)', () => {
      // Setup: Get to pinEntry state
      authStore.setEmail('test@example.com');
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });
      authStore.notifyPinSent();

      expect(get(authStore).signInState).toBe('pinEntry');

      // Act: Try EMAIL_VERIFIED from pinEntry (should not work)
      const sessionData = {
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
      };

      authStore.sendSignInEvent({ type: 'EMAIL_VERIFIED', session: sessionData });

      // Assert: Should remain in pinEntry
      expect(get(authStore).signInState).toBe('pinEntry');
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
      const afterState = get(authStore);
      expect(afterState.signInState).toBe('signedIn');
      expect(afterState.state).toBe('authenticated');
      expect(afterState.user).toBeDefined();
      expect(afterState.accessToken).toBe('test-token');
    });

    it('should handle verification failure', async () => {
      // Setup: Mock API to fail
      mockApiClient.verifyAppEmailCode.mockRejectedValue(new Error('Invalid code'));

      authStore.setEmail('test@example.com');
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });
      authStore.notifyPinSent();

      const beforeState = get(authStore);
      expect(beforeState.signInState).toBe('pinEntry');

      // Act: Try to verify with wrong code
      await expect(authStore.verifyEmailCode('wrong')).rejects.toThrow('Invalid code');

      // Assert: Should remain in pinEntry
      const afterState = get(authStore);
      expect(afterState.signInState).toBe('pinEntry');
      expect(afterState.state).toBe('unauthenticated');
    });
  });

  describe('Complete authentication flow', () => {
    it('should handle full PIN authentication flow', async () => {
      // 1. Start with email entry
      expect(get(authStore).signInState).toBe('emailEntry');

      // 2. Check user
      await authStore.checkUser('test@example.com');
      expect(get(authStore).signInState).toBe('userChecked');

      // 3. Send PIN (or use existing)
      authStore.notifyPinSent();
      expect(get(authStore).signInState).toBe('pinEntry');
      expect(get(authStore).emailCodeSent).toBe(true);

      // 4. Verify PIN
      await authStore.verifyEmailCode('123456');
      expect(get(authStore).signInState).toBe('signedIn');
      expect(get(authStore).state).toBe('authenticated');
    });

    it('should handle flow with existing valid PIN', async () => {
      // 1. Check user (has valid PIN)
      await authStore.checkUser('test@example.com');
      const userState = get(authStore);
      expect(userState.hasValidPin).toBe(true);
      expect(userState.pinRemainingMinutes).toBeGreaterThan(0);

      // 2. Go directly to PIN entry (skip sending)
      authStore.notifyPinSent();
      expect(get(authStore).signInState).toBe('pinEntry');

      // 3. Verify existing PIN
      await authStore.verifyEmailCode('123456');
      expect(get(authStore).signInState).toBe('signedIn');
    });
  });
});