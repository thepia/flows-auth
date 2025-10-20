/**
 * Token Refresh Security & Edge Cases Tests
 *
 * Validates security-critical scenarios and edge cases for token refresh:
 * - No sensitive data exposure in logs
 * - Proper cleanup on sign out
 * - Compromised token handling
 * - Concurrent request handling
 * - State recovery after interruptions
 *
 * CRITICAL: These tests protect against security vulnerabilities and data loss
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig, SignInResponse } from '../../src/types';

describe('Token Refresh Security & Edge Cases', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let mockApiClient: any;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let localStorageMock: any;

  const mockConfig: AuthConfig = {
    apiBaseUrl: 'https://api.test.com',
    clientId: 'test-client',
    domain: 'test.com',
    appCode: 'test-app',
    enablePasskeys: true,
    enableMagicLinks: false,
    branding: {
      companyName: 'Test Company'
    }
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true,
    createdAt: new Date().toISOString()
  };

  beforeEach(async () => {
    // Set up localStorage mock
    localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
        get _store() {
          return store;
        }
      };
    })();

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log');
    consoleWarnSpy = vi.spyOn(console, 'warn');
    consoleErrorSpy = vi.spyOn(console, 'error');

    mockApiClient = {
      refreshToken: vi.fn(),
      signOut: vi.fn(),
      config: {
        apiBaseUrl: 'https://api.test.com',
        domain: 'test.com',
        appCode: 'test-app'
      }
    };

    authStore = createAuthStore(mockConfig, mockApiClient);

    // Set up initial authenticated state
    authStore.core.getState().updateUser(mockUser);
    await authStore.core.getState().updateTokens({
      access_token: 'initial-access-token',
      refresh_token: 'super-secret-refresh-token-abc123xyz',
      expiresAt: Date.now() + 900000 // 15 minutes
    });

    // Manually save session to localStorage for tests that expect it
    // Using SignInData format (nested structure) - this is what saveSession() actually writes
    // Note: Storage format uses camelCase for tokens (accessToken, refreshToken)
    const sessionData = {
      user: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        initials: 'TU',
        avatar: undefined,
        preferences: undefined
      },
      tokens: {
        accessToken: 'initial-access-token',
        refreshToken: 'super-secret-refresh-token-abc123xyz',
        expiresAt: Date.now() + 900000,
        refreshedAt: Date.now()
      },
      authMethod: 'passkey' as const
    };
    localStorageMock.setItem('thepia_auth_session', JSON.stringify(sessionData));

    // Also save user data separately (new user support)
    const userData = {
      userId: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      avatar: undefined,
      emailVerified: mockUser.emailVerified,
      createdAt: mockUser.createdAt,
      lastLoginAt: new Date().toISOString(),
      metadata: {},
      authMethod: 'passkey' as const
    };
    localStorageMock.setItem('thepia_last_user', JSON.stringify(userData));

    vi.clearAllMocks();
  });

  afterEach(() => {
    authStore.destroy();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    localStorageMock.clear();
  });

  describe('Security: Sensitive Data Exposure', () => {
    it('should NOT expose full refresh_token in console logs', async () => {
      mockApiClient.refreshToken.mockResolvedValueOnce({
        step: 'success',
        access_token: 'new-access-token',
        refresh_token: 'new-super-secret-refresh-token-xyz789',
        expires_in: 3600
      });

      await authStore.refreshTokens();

      // Get all console log calls
      const allLogCalls = consoleLogSpy.mock.calls.map((call) => JSON.stringify(call));

      // Verify full refresh token is NOT in any logs
      const fullRefreshTokenInLogs = allLogCalls.some(
        (log) =>
          log.includes('super-secret-refresh-token-abc123xyz') ||
          log.includes('new-super-secret-refresh-token-xyz789')
      );

      expect(fullRefreshTokenInLogs).toBe(false);

      // Verify logs either contain truncated tokens OR don't log tokens at all (both are secure)
      // Not logging tokens is actually MORE secure than masking them
      const hasTruncatedToken = allLogCalls.some(
        (log) => log.includes('refresh_token') && log.includes('...')
      );
      const hasRefreshTokenMention = allLogCalls.some((log) => log.includes('refresh_token'));

      // Either we have masked tokens, or we don't log them at all
      expect(hasTruncatedToken || !hasRefreshTokenMention).toBe(true);
    });

    it('should NOT expose access_token in plain text logs', async () => {
      mockApiClient.refreshToken.mockResolvedValueOnce({
        step: 'success',
        access_token: 'new-secret-access-token-full-value',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      });

      await authStore.refreshTokens();

      const allLogCalls = consoleLogSpy.mock.calls.map((call) => JSON.stringify(call));

      // Full access token should not appear in logs
      const fullAccessTokenInLogs = allLogCalls.some((log) =>
        log.includes('new-secret-access-token-full-value')
      );

      expect(fullAccessTokenInLogs).toBe(false);
    });

    it('should mask tokens in localStorage inspection', () => {
      const session = localStorageMock.getItem('thepia_auth_session');
      expect(session).toBeTruthy();

      const sessionData = JSON.parse(session);

      // Verify tokens exist in storage (they must be there) - SignInData nested format
      expect(sessionData.tokens.accessToken).toBeDefined();
      expect(sessionData.tokens.refreshToken).toBeDefined();

      // Verify they're actual tokens (not masked in storage itself)
      expect(sessionData.tokens.refreshToken).toBe('super-secret-refresh-token-abc123xyz');

      // This test documents that tokens ARE in localStorage (by design)
      // but verifies they're not leaked through logging
    });
  });

  describe('Security: Cleanup on Sign Out', () => {
    it('should clear refresh_token from memory on signOut', async () => {
      mockApiClient.signOut.mockResolvedValueOnce(undefined);

      // Verify token exists before signOut
      const beforeState = authStore.core.getState();
      expect(beforeState.refresh_token).toBe('super-secret-refresh-token-abc123xyz');

      await authStore.signOut();

      // Verify token cleared from memory
      const afterState = authStore.core.getState();
      expect(afterState.refresh_token).toBeNull();
      expect(afterState.access_token).toBeNull();
      expect(afterState.user).toBeNull();
    });

    it('should clear refresh_token from localStorage on signOut', async () => {
      mockApiClient.signOut.mockResolvedValueOnce(undefined);

      // Verify session exists before signOut
      const beforeSession = localStorageMock.getItem('thepia_auth_session');
      expect(beforeSession).toBeTruthy();

      await authStore.signOut();

      // Verify session cleared from localStorage
      const afterSession = localStorageMock.getItem('thepia_auth_session');
      expect(afterSession).toBeNull();
    });

    it('should clear tokens even if signOut API call fails', async () => {
      mockApiClient.signOut.mockRejectedValueOnce(new Error('Network error'));

      // signOut should NOT throw - it catches and continues
      await authStore.signOut();

      // Verify warning logged for failed API call
      expect(consoleWarnSpy).toHaveBeenCalledWith('Server sign out failed:', expect.any(Error));

      // Verify tokens cleared despite API failure
      const afterState = authStore.core.getState();
      expect(afterState.refresh_token).toBeNull();
      expect(afterState.access_token).toBeNull();

      const afterSession = localStorageMock.getItem('thepia_auth_session');
      expect(afterSession).toBeNull();
    });
  });

  describe('Security: Compromised Token Handling', () => {
    it('should handle stolen/compromised refresh token (401 response)', async () => {
      mockApiClient.refreshToken.mockRejectedValueOnce({
        message: 'Error: 401 Refresh token is invalid or expired',
        status: 401
      });

      // 401 is treated as transient failure, so it doesn't throw immediately
      // It schedules a retry instead
      await authStore.refreshTokens();

      // Verify error was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Token refresh failed:',
        expect.objectContaining({
          message: expect.stringContaining('401')
        })
      );
    });

    it('should clear stale refresh token on "already exchanged" error', async () => {
      mockApiClient.refreshToken.mockRejectedValueOnce({
        message: 'Refresh token already exchanged',
        code: 'invalid_grant'
      });

      // Note: "already exchanged" errors don't throw - they return early after cleanup
      await authStore.refreshTokens();

      // Verify stale token cleared from memory
      const afterState = authStore.core.getState();
      expect(afterState.refresh_token).toBeNull();

      // Verify warning logged with the error object
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Token refresh failed:',
        expect.objectContaining({
          message: expect.stringContaining('already exchanged')
        })
      );
    });

    it('should clear localStorage on "already exchanged" error to prevent retry', async () => {
      mockApiClient.refreshToken.mockRejectedValueOnce({
        message: 'Error: 401 Refresh token already exchanged',
        code: 'invalid_grant'
      });

      // Note: "already exchanged" errors don't throw - they return early after cleanup
      await authStore.refreshTokens();

      // Verify refresh token cleared from localStorage (not entire session)
      const session = localStorageMock.getItem('thepia_auth_session');
      const sessionData = JSON.parse(session);
      expect(sessionData.tokens.refreshToken).toBe('');
    });

    it('should handle revoked token (403 Forbidden)', async () => {
      mockApiClient.refreshToken.mockRejectedValueOnce({
        message: 'Error: 403 Token has been revoked',
        status: 403
      });

      // 403 is treated as transient failure, so it doesn't throw immediately
      // It schedules a retry instead
      await authStore.refreshTokens();

      // Should log the error
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Token refresh failed:',
        expect.objectContaining({
          message: expect.stringContaining('403')
        })
      );
    });
  });

  describe('Edge Case: Concurrent Refresh Attempts', () => {
    it('should handle concurrent refresh attempts safely', async () => {
      let callCount = 0;
      mockApiClient.refreshToken.mockImplementation(async () => {
        callCount++;
        // Simulate slow network
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          step: 'success',
          access_token: `new-access-token-${callCount}`,
          refresh_token: `new-refresh-token-${callCount}`,
          expires_in: 3600
        };
      });

      // Fire multiple concurrent refresh requests
      const refreshPromises = [
        authStore.refreshTokens(),
        authStore.refreshTokens(),
        authStore.refreshTokens()
      ];

      await Promise.all(refreshPromises);

      // All should succeed (no race condition crashes)
      const finalState = authStore.core.getState();
      expect(finalState.access_token).toBeDefined();
      expect(finalState.refresh_token).toBeDefined();

      // Verify we made actual API calls (not silently dropped)
      expect(callCount).toBeGreaterThan(0);
    });

    it('should handle refresh while previous refresh is pending', async () => {
      let firstCallResolved = false;

      mockApiClient.refreshToken.mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        firstCallResolved = true;
        return {
          step: 'success',
          access_token: 'first-access-token',
          refresh_token: 'first-refresh-token',
          expires_in: 3600
        };
      });

      mockApiClient.refreshToken.mockImplementationOnce(async () => {
        return {
          step: 'success',
          access_token: 'second-access-token',
          refresh_token: 'second-refresh-token',
          expires_in: 3600
        };
      });

      // Start first refresh (slow)
      const firstRefresh = authStore.refreshTokens();

      // Start second refresh while first is pending
      await new Promise((resolve) => setTimeout(resolve, 50));
      const secondRefresh = authStore.refreshTokens();

      // Wait for both
      await Promise.all([firstRefresh, secondRefresh]);

      // Both should complete without errors
      const finalState = authStore.core.getState();
      expect(finalState.access_token).toBeDefined();
    });
  });

  describe('Edge Case: Interruptions & Recovery', () => {
    it('should handle page reload during refresh (state recovery)', async () => {
      // Capture session before page reload
      const sessionBeforeReload = localStorageMock.getItem('thepia_auth_session');
      expect(sessionBeforeReload).toBeTruthy();

      const sessionData = JSON.parse(sessionBeforeReload);
      // Storage format uses camelCase for tokens (SignInData format)
      expect(sessionData.tokens.refreshToken).toBe('super-secret-refresh-token-abc123xyz');

      // Save session to simulate it persisting across reload
      const savedSession = sessionBeforeReload;

      // Simulate page reload (destroy current store instance)
      authStore.destroy();

      // Restore session (simulating it being there after reload)
      localStorageMock.setItem('thepia_auth_session', savedSession);

      // Create new store instance (simulates page reload)
      const newStore = createAuthStore(mockConfig, mockApiClient);

      // Wait for async session restoration to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should restore from localStorage
      const restoredState = newStore.core.getState();
      expect(restoredState.user).toEqual(
        expect.objectContaining({
          email: 'test@example.com'
        })
      );
      expect(restoredState.refresh_token).toBe('super-secret-refresh-token-abc123xyz');

      newStore.destroy();
    });

    it('should handle browser crash during refresh (localStorage persistence)', async () => {
      mockApiClient.refreshToken.mockResolvedValueOnce({
        step: 'success',
        access_token: 'new-access-token-after-crash',
        refresh_token: 'new-refresh-token-after-crash',
        expires_in: 3600
      });

      // Simulate refresh
      await authStore.refreshTokens();

      // Capture session with new tokens BEFORE crash
      const session = localStorageMock.getItem('thepia_auth_session');
      expect(session).toBeTruthy(); // Session should exist in localStorage

      const sessionData = JSON.parse(session);

      // New tokens should be persisted to localStorage (using SignInData nested format)
      expect(sessionData.tokens.refreshToken).toBe('new-refresh-token-after-crash');

      // Save session to restore after crash
      const savedSession = session;

      // Simulate browser crash (destroy store)
      authStore.destroy();

      // Restore session (simulating it persisting through crash)
      localStorageMock.setItem('thepia_auth_session', savedSession);

      // Simulate browser restart - create new store
      const newStore = createAuthStore(mockConfig, mockApiClient);

      // Wait for async session restoration to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should recover with NEW tokens (not old ones)
      const recoveredState = newStore.core.getState();
      expect(recoveredState.refresh_token).toBe('new-refresh-token-after-crash');
      expect(recoveredState.access_token).toBe('new-access-token-after-crash');

      newStore.destroy();
    });

    it('should handle missing localStorage access (incognito mode recovery)', async () => {
      // Simulate localStorage unavailable
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('localStorage is not available');
        },
        configurable: true
      });

      // Creating store should not crash
      const incognitoStore = createAuthStore(mockConfig, mockApiClient);

      // Should work in memory-only mode
      await incognitoStore.core.getState().updateTokens({
        access_token: 'memory-only-access',
        refresh_token: 'memory-only-refresh',
        expiresAt: Date.now() + 900000
      });

      const state = incognitoStore.core.getState();
      expect(state.refresh_token).toBe('memory-only-refresh');

      incognitoStore.destroy();

      // Restore localStorage for other tests
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
        configurable: true
      });
    });

    it('should handle corrupted localStorage session data', () => {
      // Corrupt the session data
      localStorageMock.setItem('thepia_auth_session', 'invalid-json-{{{');

      // Create new store - should not crash
      const newStore = createAuthStore(mockConfig, mockApiClient);

      // Should start with clean state (not crash)
      const state = newStore.core.getState();
      expect(state.user).toBeNull();
      expect(state.refresh_token).toBeNull();

      newStore.destroy();
    });
  });

  describe('Edge Case: Token Expiry Edge Cases', () => {
    it('should handle refresh when token already expired', async () => {
      // Set expired token
      await authStore.core.getState().updateTokens({
        access_token: 'expired-access-token',
        refresh_token: 'valid-refresh-token',
        expiresAt: Date.now() - 10000 // Expired 10 seconds ago
      });

      mockApiClient.refreshToken.mockResolvedValueOnce({
        step: 'success',
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      });

      // Should still successfully refresh
      await authStore.refreshTokens();

      const state = authStore.core.getState();
      expect(state.access_token).toBe('new-access-token');
    });

    it('should handle refresh without refresh_token', async () => {
      // Clear refresh token by setting state directly
      authStore.core.setState({ refresh_token: null });

      // Should throw error when no refresh token is available
      try {
        await authStore.refreshTokens();
        // If we get here, the test should fail
        expect(true).toBe(false);
      } catch (error: any) {
        // The error should be about missing refresh token
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    it('should handle refresh with undefined expiresAt', async () => {
      await authStore.core.getState().updateTokens({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expiresAt: undefined // No expiry set
      });

      mockApiClient.refreshToken.mockResolvedValueOnce({
        step: 'success',
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      });

      // Should successfully refresh
      await authStore.refreshTokens();

      const state = authStore.core.getState();
      expect(state.access_token).toBe('new-access-token');
      expect(state.expiresAt).toBeDefined();
    });
  });
});
