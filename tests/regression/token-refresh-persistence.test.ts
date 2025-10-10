/**
 * REGRESSION TEST: Token Refresh Persistence
 *
 * This test verifies the fix for the "already exchanged" error that occurred
 * when WorkOS refresh tokens were not being saved to localStorage after refresh.
 *
 * Bug History:
 * - Issue: Token refresh would succeed but new refresh token wasn't persisted
 * - Result: On next page load or auto-refresh, old token was reused
 * - WorkOS Error: "Refresh token already exchanged" (one-time use tokens)
 * - Root Cause: auth-store.ts refreshTokens() didn't call session.saveSession()
 *
 * Fix: Added session persistence in auth-store.ts:321-357
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

    const config: AuthConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.com',
      appCode: 'test',
      enablePasskeys: true
    };

    // Create auth store with injected mock API client
    authStore = createAuthStore(config, mockApiClient);
  });

  afterEach(() => {
    authStore.destroy();
  });

  it('should persist new refresh token to localStorage after successful refresh', async () => {
    // ARRANGE: Set up initial authenticated session
    const initialSession = {
      user: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        initials: 'TU',
        avatar: undefined,
        preferences: undefined
      },
      tokens: {
        access_token: mockInitialTokens.access_token,
        refresh_token: mockInitialTokens.refresh_token,
        expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
      },
      authMethod: 'passkey' as const,
      lastActivity: Date.now()
    };

    // Save initial session to localStorage
    localStorageMock.setItem('thepia_auth_session', JSON.stringify(initialSession));

    // Set up auth store with initial tokens (simulate restored session)
    authStore.core.getState().updateUser(mockUser);
    authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    // Verify initial state
    const initialStoredSession = JSON.parse(localStorageMock.getItem('thepia_auth_session')!);
    expect(initialStoredSession.tokens.refresh_token).toBe(mockInitialTokens.refresh_token);

    // ACT: Call refreshTokens (simulates auto-refresh or manual refresh)
    await authStore.refreshTokens();

    // ASSERT: New refresh token should be persisted to localStorage
    const updatedStoredSession = JSON.parse(localStorageMock.getItem('thepia_auth_session')!);

    expect(updatedStoredSession.tokens.refresh_token).toBe(mockRefreshedTokens.refresh_token);
    expect(updatedStoredSession.tokens.refresh_token).not.toBe(mockInitialTokens.refresh_token);
    expect(updatedStoredSession.tokens.access_token).toBe(mockRefreshedTokens.access_token);

    // Verify the API was called with the correct token
    expect(mockApiClient.refreshToken).toHaveBeenCalledWith({
      refresh_token: mockInitialTokens.refresh_token
    });
    expect(mockApiClient.refreshToken).toHaveBeenCalledTimes(1);
  });

  it('should prevent "already exchanged" error by using new token on subsequent refresh', async () => {
    // ARRANGE: Set up initial session
    const initialSession = {
      user: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        initials: 'TU',
        avatar: undefined,
        preferences: undefined
      },
      tokens: {
        access_token: mockInitialTokens.access_token,
        refresh_token: mockInitialTokens.refresh_token,
        expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
      },
      authMethod: 'passkey' as const,
      lastActivity: Date.now()
    };

    localStorageMock.setItem('thepia_auth_session', JSON.stringify(initialSession));

    authStore.core.getState().updateUser(mockUser);
    authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    // ACT 1: First refresh
    await authStore.refreshTokens();

    // Verify new token is in localStorage
    const afterFirstRefresh = JSON.parse(localStorageMock.getItem('thepia_auth_session')!);
    expect(afterFirstRefresh.tokens.refresh_token).toBe(mockRefreshedTokens.refresh_token);

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

    // Verify the second new token is now in localStorage
    const afterSecondRefresh = JSON.parse(localStorageMock.getItem('thepia_auth_session')!);
    expect(afterSecondRefresh.tokens.refresh_token).toBe(mockSecondRefreshTokens.refresh_token);
  });

  it('should preserve authMethod from existing session during refresh', async () => {
    // ARRANGE: Set up session with email-code auth method
    const initialSession = {
      user: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        initials: 'TU',
        avatar: undefined,
        preferences: undefined
      },
      tokens: {
        access_token: mockInitialTokens.access_token,
        refresh_token: mockInitialTokens.refresh_token,
        expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
      },
      authMethod: 'email-code' as const, // NOT passkey
      lastActivity: Date.now()
    };

    localStorageMock.setItem('thepia_auth_session', JSON.stringify(initialSession));

    authStore.core.getState().updateUser(mockUser);
    authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    // ACT: Refresh tokens
    await authStore.refreshTokens();

    // ASSERT: authMethod should be preserved
    const updatedSession = JSON.parse(localStorageMock.getItem('thepia_auth_session')!);
    expect(updatedSession.authMethod).toBe('email-code');
  });

  it('should update lastActivity timestamp on refresh', async () => {
    // ARRANGE
    const oldTimestamp = Date.now() - 10000; // 10 seconds ago
    const initialSession = {
      user: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        initials: 'TU',
        avatar: undefined,
        preferences: undefined
      },
      tokens: {
        access_token: mockInitialTokens.access_token,
        refresh_token: mockInitialTokens.refresh_token,
        expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
      },
      authMethod: 'passkey' as const,
      lastActivity: oldTimestamp
    };

    localStorageMock.setItem('thepia_auth_session', JSON.stringify(initialSession));

    authStore.core.getState().updateUser(mockUser);
    authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    // ACT
    await authStore.refreshTokens();

    // ASSERT: lastActivity should be updated to current time
    const updatedSession = JSON.parse(localStorageMock.getItem('thepia_auth_session')!);
    expect(updatedSession.lastActivity).toBeGreaterThan(oldTimestamp);
    expect(updatedSession.lastActivity).toBeCloseTo(Date.now(), -2); // Within 100ms
  });

  it('should handle refresh when no session exists gracefully', async () => {
    // ARRANGE: No session in localStorage, but tokens in core store
    authStore.core.getState().updateUser(mockUser);
    authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    // ACT
    await authStore.refreshTokens();

    // ASSERT: Should create new session entry
    const session = localStorageMock.getItem('thepia_auth_session');
    expect(session).toBeTruthy();

    const parsedSession = JSON.parse(session!);
    expect(parsedSession.tokens.refresh_token).toBe(mockRefreshedTokens.refresh_token);
    expect(parsedSession.authMethod).toBe('passkey'); // Default fallback
  });
});
