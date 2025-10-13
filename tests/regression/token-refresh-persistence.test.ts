/**
 * REGRESSION TEST: Token Refresh Persistence
 *
 * This test verifies the fix for the "already exchanged" error that occurred
 * when WorkOS refresh tokens were not being saved to storage after refresh.
 *
 * Bug History:
 * - Issue: Token refresh would succeed but new refresh token wasn't persisted
 * - Result: On next page load or auto-refresh, old token was reused
 * - WorkOS Error: "Refresh token already exchanged" (one-time use tokens)
 * - Root Cause: auth-core.ts refreshTokens() used set() instead of updateTokens()
 *
 * CRITICAL ARCHITECTURE:
 * There are TWO token refresh code paths:
 * 1. Manual refresh: authStore.refreshTokens() → manually saves to session store
 * 2. Auto-refresh: scheduleTokenRefresh() → calls core.refreshTokens() directly
 *
 * The bug was in path #2: core.refreshTokens() was calling set() directly,
 * bypassing DatabaseAdapter.saveSession() in updateTokens().
 *
 * Fix: Changed core.refreshTokens() to call updateTokens() which:
 * - Updates store state
 * - Calls db.saveSession() to persist to storage
 * - Schedules next refresh
 *
 * This is a CRITICAL test that must never be removed or disabled.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig } from '../../src/types';

// Mock localStorage
const localStorageMock = (() => {
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
    get store() {
      return store;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('REGRESSION: Token Refresh Persistence', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let mockApiClient: any;
  let mockDatabaseAdapter: any;
  let saveSessionSpy: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true,
    createdAt: new Date().toISOString()
  };

  const mockInitialTokens = {
    access_token: 'initial-access-token-12345',
    refresh_token: 'initial-refresh-token-67890',
    expires_in: 900 // 15 minutes
  };

  const mockRefreshedTokens = {
    access_token: 'new-access-token-ABCDE',
    refresh_token: 'new-refresh-token-FGHIJ', // NEW refresh token from server
    expires_in: 900
  };

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();

    // Create mock API client
    mockApiClient = {
      refreshToken: vi.fn().mockResolvedValue(mockRefreshedTokens),
      config: {
        apiBaseUrl: 'https://api.test.com',
        domain: 'test.com',
        appCode: 'test'
      }
    };

    // Create spy for DatabaseAdapter.saveSession
    saveSessionSpy = vi.fn().mockResolvedValue(undefined);

    mockDatabaseAdapter = {
      saveSession: saveSessionSpy,
      loadSession: vi.fn().mockResolvedValue(null),
      clearSession: vi.fn().mockResolvedValue(undefined)
    };

    const config: AuthConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.com',
      appCode: 'test',
      enablePasskeys: true,
      database: mockDatabaseAdapter // Inject mock database adapter
    };

    // Create auth store with injected mock API client and database adapter
    authStore = createAuthStore(config, mockApiClient);
  });

  afterEach(() => {
    authStore.destroy();
  });

  it('should persist new refresh token to DatabaseAdapter after successful refresh', async () => {
    // ARRANGE: Set up initial authenticated session
    authStore.core.getState().updateUser(mockUser);
    await authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    // Clear the spy call count from setup
    saveSessionSpy.mockClear();

    // ACT: Call refreshTokens (simulates auto-refresh or manual refresh)
    await authStore.refreshTokens();

    // ASSERT: DatabaseAdapter.saveSession must be called during refresh
    expect(saveSessionSpy).toHaveBeenCalled();

    // Verify the new refresh token is passed to saveSession
    const saveSessionCalls = saveSessionSpy.mock.calls;
    const lastCall = saveSessionCalls[saveSessionCalls.length - 1][0];

    expect(lastCall.refreshToken).toBe(mockRefreshedTokens.refresh_token);
    expect(lastCall.refreshToken).not.toBe(mockInitialTokens.refresh_token);
    expect(lastCall.accessToken).toBe(mockRefreshedTokens.access_token);
    expect(lastCall.userId).toBe(mockUser.id);
    expect(lastCall.email).toBe(mockUser.email);

    // Verify the API was called with the correct token
    expect(mockApiClient.refreshToken).toHaveBeenCalledWith({
      refresh_token: mockInitialTokens.refresh_token
    });
    expect(mockApiClient.refreshToken).toHaveBeenCalledTimes(1);
  });

  it('should prevent "already exchanged" error by using new token on subsequent refresh', async () => {
    // ARRANGE: Set up initial session
    authStore.core.getState().updateUser(mockUser);
    await authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    saveSessionSpy.mockClear();

    // ACT 1: First refresh
    await authStore.refreshTokens();

    // Verify new token was saved to DatabaseAdapter
    let lastSaveCall = saveSessionSpy.mock.calls[saveSessionSpy.mock.calls.length - 1][0];
    expect(lastSaveCall.refreshToken).toBe(mockRefreshedTokens.refresh_token);

    // Mock second refresh with different tokens
    const mockSecondRefreshTokens = {
      access_token: 'second-access-token-XYZ',
      refresh_token: 'second-refresh-token-UVW',
      expires_in: 900
    };
    mockApiClient.refreshToken.mockResolvedValueOnce(mockSecondRefreshTokens);

    // ACT 2: Second refresh (simulating auto-refresh after some time)
    await authStore.refreshTokens();

    // ASSERT: Should have called API with the NEW refresh token from first refresh
    expect(mockApiClient.refreshToken).toHaveBeenCalledTimes(2);
    expect(mockApiClient.refreshToken).toHaveBeenNthCalledWith(2, {
      refresh_token: mockRefreshedTokens.refresh_token // NOT the initial token!
    });

    // Verify the second new token was saved to DatabaseAdapter
    lastSaveCall = saveSessionSpy.mock.calls[saveSessionSpy.mock.calls.length - 1][0];
    expect(lastSaveCall.refreshToken).toBe(mockSecondRefreshTokens.refresh_token);
  });

  it('should save session after manual refresh via authStore.refreshTokens()', async () => {
    // This verifies that authStore.refreshTokens() (the wrapper) also saves to DatabaseAdapter
    // Both manual (authStore) and auto (core) refresh paths must persist tokens

    // ARRANGE
    authStore.core.getState().updateUser(mockUser);
    await authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    saveSessionSpy.mockClear();

    // ACT: Refresh tokens via authStore wrapper (manual refresh path)
    await authStore.refreshTokens();

    // ASSERT: DatabaseAdapter.saveSession should be called
    expect(saveSessionSpy).toHaveBeenCalled();
    const lastCall = saveSessionSpy.mock.calls[saveSessionSpy.mock.calls.length - 1][0];
    expect(lastCall.refreshToken).toBe(mockRefreshedTokens.refresh_token);
  });

  it('should call saveSession on refresh (verifying persistence)', async () => {
    // ARRANGE
    authStore.core.getState().updateUser(mockUser);
    await authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    saveSessionSpy.mockClear();

    // ACT
    await authStore.refreshTokens();

    // ASSERT: saveSession should be called, proving session is persisted
    expect(saveSessionSpy).toHaveBeenCalled();
    const lastCall = saveSessionSpy.mock.calls[saveSessionSpy.mock.calls.length - 1][0];
    expect(lastCall.refreshToken).toBe(mockRefreshedTokens.refresh_token);
  });

  it('should persist tokens when auto-refresh is triggered (scheduleTokenRefresh path)', async () => {
    // This test verifies the auto-refresh path that was previously broken
    // Auto-refresh calls core.refreshTokens() directly, not authStore.refreshTokens()

    // ARRANGE: Set up initial authenticated session
    authStore.core.getState().updateUser(mockUser);
    await authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    // Clear the spy call count from setup
    saveSessionSpy.mockClear();

    // ACT: Call core.refreshTokens() directly (simulates auto-refresh timer)
    // This is the buggy path that was NOT saving to DatabaseAdapter
    await authStore.core.getState().refreshTokens();

    // ASSERT: DatabaseAdapter.saveSession MUST be called even on auto-refresh
    expect(saveSessionSpy).toHaveBeenCalled();

    // Verify the new refresh token is passed to saveSession
    const saveSessionCalls = saveSessionSpy.mock.calls;
    const lastCall = saveSessionCalls[saveSessionCalls.length - 1][0];

    expect(lastCall.refreshToken).toBe(mockRefreshedTokens.refresh_token);
    expect(lastCall.refreshToken).not.toBe(mockInitialTokens.refresh_token);
    expect(lastCall.accessToken).toBe(mockRefreshedTokens.access_token);
    expect(lastCall.userId).toBe(mockUser.id);
  });

  it('should handle refresh when no prior session exists in DatabaseAdapter', async () => {
    // ARRANGE: No session in DatabaseAdapter (loadSession returns null), but tokens in core store
    mockDatabaseAdapter.loadSession.mockResolvedValue(null);

    authStore.core.getState().updateUser(mockUser);
    await authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    saveSessionSpy.mockClear();

    // ACT
    await authStore.refreshTokens();

    // ASSERT: Should create new session entry via saveSession
    expect(saveSessionSpy).toHaveBeenCalled();

    const lastCall = saveSessionSpy.mock.calls[saveSessionSpy.mock.calls.length - 1][0];
    expect(lastCall.refreshToken).toBe(mockRefreshedTokens.refresh_token);
    expect(lastCall.authMethod).toBe('passkey'); // Default fallback when no existing session
  });
});
