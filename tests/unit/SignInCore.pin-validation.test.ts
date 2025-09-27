/**
 * Auth Store Pin Validation Tests
 *
 * Tests for pin expiry validation and remaining time calculation
 * in the auth store's checkUser functionality
 */
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores';
import type { AuthConfig } from '../../src/types';

// Mock the API client
vi.mock('../../src/api/auth-api', () => ({
  AuthApiClient: vi.fn().mockImplementation(() => ({
    checkEmail: vi.fn(),
    signInWithMagicLink: vi.fn(),
    signInWithPasskey: vi.fn(),
    sendAppEmailCode: vi.fn(),
    verifyAppEmailCode: vi.fn(),
    refreshToken: vi.fn(),
    signOut: vi.fn()
  }))
}));

// Mock WebAuthn
vi.mock('../../src/utils/webauthn', () => ({
  authenticateWithPasskey: vi.fn(),
  serializeCredential: vi.fn(),
  isWebAuthnSupported: vi.fn(() => false),
  isConditionalMediationSupported: vi.fn(() => false)
}));

describe('Auth Store Pin Validation', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let mockApiClient: any;
  const mockConfig: AuthConfig = {
    apiBaseUrl: 'https://api.test.com',
    clientId: 'test-client',
    domain: 'test.com',
    enablePasskeys: false,
    enableMagicLinks: false,
    appCode: 'test-app'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Mock Date to return a consistent timestamp for testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-09-26T13:30:00.000Z'));

    // Create a mock API client
    mockApiClient = {
      checkEmail: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithPasskey: vi.fn(),
      sendAppEmailCode: vi.fn(),
      verifyAppEmailCode: vi.fn(),
      refreshToken: vi.fn(),
      signOut: vi.fn()
    };

    // Inject the mock API client
    authStore = createAuthStore(mockConfig, mockApiClient as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkUser with pin validation', () => {
    it('should detect valid pin when expiry is in the future', async () => {
      const mockResponse = {
        exists: true,
        hasPasskey: false,
        userId: 'user_123',
        emailVerified: true,
        lastPinExpiry: '2025-09-26T13:35:00.000Z' // 5 minutes in the future
      };

      mockApiClient.checkEmail.mockResolvedValue(mockResponse);

      await authStore.checkUser('test@example.com');

      const state = get(authStore);
      expect(state.hasValidPin).toBe(true);
      expect(state.pinRemainingMinutes).toBe(5);
    });

    it('should detect expired pin when expiry is in the past', async () => {
      const mockResponse = {
        exists: true,
        hasPasskey: false,
        userId: 'user_123',
        emailVerified: true,
        lastPinExpiry: '2025-09-26T13:25:00.000Z' // 5 minutes in the past
      };

      mockApiClient.checkEmail.mockResolvedValue(mockResponse);

      await authStore.checkUser('test@example.com');

      const state = get(authStore);
      expect(state.hasValidPin).toBe(false);
      expect(state.pinRemainingMinutes).toBe(0);
    });

    it('should handle missing lastPinExpiry', async () => {
      const mockResponse = {
        exists: true,
        hasPasskey: false,
        userId: 'user_123',
        emailVerified: true
        // lastPinExpiry is missing
      };

      mockApiClient.checkEmail.mockResolvedValue(mockResponse);

      await authStore.checkUser('test@example.com');

      const state = get(authStore);
      expect(state.hasValidPin).toBe(false);
      expect(state.pinRemainingMinutes).toBe(0);
    });

    it('should handle null lastPinExpiry', async () => {
      const mockResponse = {
        exists: true,
        hasPasskey: false,
        userId: 'user_123',
        emailVerified: true,
        lastPinExpiry: null
      };

      mockApiClient.checkEmail.mockResolvedValue(mockResponse);

      await authStore.checkUser('test@example.com');

      const state = get(authStore);
      expect(state.hasValidPin).toBe(false);
      expect(state.pinRemainingMinutes).toBe(0);
    });

    it('should round up partial minutes correctly', async () => {
      const mockResponse = {
        exists: true,
        hasPasskey: false,
        userId: 'user_123',
        emailVerified: true,
        lastPinExpiry: '2025-09-26T13:34:30.000Z' // 4.5 minutes in the future
      };

      mockApiClient.checkEmail.mockResolvedValue(mockResponse);

      await authStore.checkUser('test@example.com');

      const state = get(authStore);
      expect(state.hasValidPin).toBe(true);
      expect(state.pinRemainingMinutes).toBe(5); // Should round up to 5
    });

    it('should handle pin expiring in seconds', async () => {
      const mockResponse = {
        exists: true,
        hasPasskey: false,
        userId: 'user_123',
        emailVerified: true,
        lastPinExpiry: '2025-09-26T13:30:30.000Z' // 30 seconds in the future
      };

      mockApiClient.checkEmail.mockResolvedValue(mockResponse);

      await authStore.checkUser('test@example.com');

      const state = get(authStore);
      expect(state.hasValidPin).toBe(true);
      expect(state.pinRemainingMinutes).toBe(1); // Should round up to 1
    });

    it('should handle exactly expired pin', async () => {
      const mockResponse = {
        exists: true,
        hasPasskey: false,
        userId: 'user_123',
        emailVerified: true,
        lastPinExpiry: '2025-09-26T13:30:00.000Z' // Exactly now
      };

      mockApiClient.checkEmail.mockResolvedValue(mockResponse);

      await authStore.checkUser('test@example.com');

      const state = get(authStore);
      expect(state.hasValidPin).toBe(false);
      expect(state.pinRemainingMinutes).toBe(0);
    });

    it('should handle invalid date strings gracefully', async () => {
      const mockResponse = {
        exists: true,
        hasPasskey: false,
        userId: 'user_123',
        emailVerified: true,
        lastPinExpiry: 'invalid-date-string'
      };

      mockApiClient.checkEmail.mockResolvedValue(mockResponse);

      await authStore.checkUser('test@example.com');

      const state = get(authStore);
      expect(state.hasValidPin).toBe(false);
      expect(state.pinRemainingMinutes).toBe(0);
    });
  });

  describe('Real API Response Format', () => {
    it('should handle WorkOS API response format with ISO date strings', async () => {
      // Based on the actual API response structure from user testing
      const mockResponse = {
        exists: true,
        hasWebAuthn: false,
        hasPasskey: false,
        userId: 'workos|user_01K4DDYMKSK82XKFYAKBG54AH9',
        emailVerified: true,
        lastPinExpiry: '2025-09-26T13:36:23.391Z', // ~6 minutes in the future
        lastPinSentAt: '2025-09-26T13:26:24.136Z',
        organization: {
          code: 'demo',
          name: 'WorkOS Demo Environment',
          provider: 'workos',
          features: {
            webauthn: false,
            sso: true
          }
        }
      };

      mockApiClient.checkEmail.mockResolvedValue(mockResponse);

      await authStore.checkUser('test@example.com');

      const state = get(authStore);
      expect(state.hasValidPin).toBe(true);
      expect(state.pinRemainingMinutes).toBe(7); // Should be ~6.4 minutes, rounded up to 7
      expect(state.userExists).toBe(true);
      expect(state.hasPasskeys).toBe(false);
    });

    it('should NOT incorrectly parse ISO date string as integer', async () => {
      // This tests the bug that was fixed where parseInt was used on ISO date strings
      const mockResponse = {
        exists: true,
        hasPasskey: false,
        userId: 'user_123',
        emailVerified: true,
        lastPinExpiry: '2025-09-26T13:35:00.000Z' // ISO string, not a number
      };

      mockApiClient.checkEmail.mockResolvedValue(mockResponse);

      await authStore.checkUser('test@example.com');

      const state = get(authStore);
      // The bug would have parsed "2025-09-26..." as 2025 (the year)
      // which would create a date far in the future
      expect(state.hasValidPin).toBe(true);
      expect(state.pinRemainingMinutes).toBe(5); // Correct: 5 minutes
      // NOT expect(state.pinRemainingMinutes).toBeGreaterThan(1000); // Wrong: would be years
    });
  });

  describe('State transitions', () => {
    it('should transition to userChecked state with pin information', async () => {
      const mockResponse = {
        exists: true,
        hasPasskey: false,
        userId: 'user_123',
        emailVerified: true,
        lastPinExpiry: '2025-09-26T13:35:00.000Z'
      };

      mockApiClient.checkEmail.mockResolvedValue(mockResponse);

      await authStore.checkUser('test@example.com');

      const state = get(authStore);
      expect(state.signInState).toBe('userChecked');
      expect(state.hasValidPin).toBe(true);
      expect(state.pinRemainingMinutes).toBe(5);
    });

    it('should clear pin status when email is cleared', () => {
      // Set initial state with valid pin
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false,
        hasValidPin: true,
        pinRemainingMinutes: 5
      });

      let state = get(authStore);
      expect(state.hasValidPin).toBe(true);

      // Clear email
      authStore.setEmail('');

      state = get(authStore);
      expect(state.hasValidPin).toBe(false);
      expect(state.pinRemainingMinutes).toBe(0);
      expect(state.email).toBe('');
    });
  });
});
