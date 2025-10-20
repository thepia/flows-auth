/**
 * REGRESSION TEST: Server Omits refresh_token in Refresh Response
 *
 * This test verifies the handling when the server responds to a token refresh
 * WITHOUT returning a new refresh_token in the response.
 *
 * OAuth2 Spec Compliance:
 * RFC 6749 Section 6 states that when refreshing tokens, the authorization server:
 * - MUST issue a new access token
 * - MAY issue a new refresh token (optional)
 * - If a new refresh token is issued, the client MUST discard the old one
 * - If NO new refresh token is issued, the client MUST keep using the existing one
 *
 * Bug Scenario:
 * Some OAuth2 servers (including WorkOS in certain configurations) may choose
 * NOT to rotate refresh tokens on every refresh. In this case:
 * - Response contains: { access_token: "new-token", expires_in: 900 }
 * - Response OMITS: refresh_token field
 *
 * Expected Behavior:
 * - Client should preserve the existing refresh_token
 * - Next refresh should still work using the preserved refresh_token
 *
 * Buggy Behavior (if present):
 * - refresh_token gets set to undefined/null
 * - Next refresh attempt fails with "No refresh token available"
 * - User gets signed out despite having a valid refresh token
 *
 * This test PROVES whether the current implementation correctly handles this scenario.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig } from '../../src/types';
import { createSimpleMockSessionPersistence } from '../helpers/session-persistence-mock';

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

describe('REGRESSION: Server Omits refresh_token in Response', () => {
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
    refresh_token: 'initial-refresh-token-67890', // This should be preserved
    expires_in: 900 // 15 minutes
  };

  // Server response WITHOUT refresh_token (server chose not to rotate)
  const mockRefreshResponseWithoutNewRefreshToken = {
    access_token: 'new-access-token-ABCDE',
    // refresh_token: OMITTED - server doesn't rotate refresh tokens
    expires_in: 900
  };

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();

    // Create mock API client
    mockApiClient = {
      refreshToken: vi.fn().mockResolvedValue(mockRefreshResponseWithoutNewRefreshToken),
      config: {
        apiBaseUrl: 'https://api.test.com',
        domain: 'test.com',
        appCode: 'test'
      }
    };

    // Create mock SessionPersistence adapter
    mockDatabaseAdapter = createSimpleMockSessionPersistence();
    saveSessionSpy = mockDatabaseAdapter.saveSession;

    const config: AuthConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.com',
      appCode: 'test',
      enablePasskeys: true,
      database: mockDatabaseAdapter
    };

    authStore = createAuthStore(config, mockApiClient);
  });

  afterEach(() => {
    authStore.destroy();
  });

  it('CRITICAL: should preserve existing refresh_token when server omits it in response', async () => {
    // ARRANGE: Set up initial authenticated session with a refresh token
    authStore.core.getState().updateUser(mockUser);
    await authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token, // Original refresh token
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    // Verify initial state has the refresh token
    const stateBefore = authStore.core.getState();
    expect(stateBefore.refresh_token).toBe(mockInitialTokens.refresh_token);

    saveSessionSpy.mockClear();

    // ACT: Call refreshTokens() - server will NOT return a new refresh_token
    await authStore.refreshTokens();

    // ASSERT: The original refresh_token MUST be preserved in memory
    const stateAfter = authStore.core.getState();
    expect(stateAfter.refresh_token).toBe(mockInitialTokens.refresh_token);
    expect(stateAfter.refresh_token).not.toBeUndefined();
    expect(stateAfter.refresh_token).not.toBeNull();

    // ASSERT: The original refresh_token MUST be preserved in storage
    expect(saveSessionSpy).toHaveBeenCalled();
    const sessionData = saveSessionSpy.mock.calls[saveSessionSpy.mock.calls.length - 1][0];
    expect(sessionData.refreshToken).toBe(mockInitialTokens.refresh_token);
    expect(sessionData.refreshToken).not.toBeUndefined();
    expect(sessionData.refreshToken).not.toBeNull();

    // ASSERT: Access token should be updated to new value
    expect(stateAfter.access_token).toBe(mockRefreshResponseWithoutNewRefreshToken.access_token);
    expect(sessionData.accessToken).toBe(mockRefreshResponseWithoutNewRefreshToken.access_token);
  });

  it('CRITICAL: should successfully refresh again using preserved refresh_token', async () => {
    // This test proves the token chain remains intact for subsequent refreshes

    // ARRANGE: Set up initial session
    authStore.core.getState().updateUser(mockUser);
    await authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    // ACT 1: First refresh (server omits refresh_token)
    await authStore.refreshTokens();

    // Verify refresh token is preserved
    const stateAfterFirstRefresh = authStore.core.getState();
    expect(stateAfterFirstRefresh.refresh_token).toBe(mockInitialTokens.refresh_token);

    // Setup second refresh
    const secondRefreshResponse = {
      access_token: 'second-access-token-XYZ',
      // Still no refresh_token from server
      expires_in: 900
    };
    mockApiClient.refreshToken.mockResolvedValueOnce(secondRefreshResponse);

    // ACT 2: Second refresh should still work
    await authStore.refreshTokens();

    // ASSERT: Second refresh should have used the preserved refresh token
    expect(mockApiClient.refreshToken).toHaveBeenCalledTimes(2);
    expect(mockApiClient.refreshToken).toHaveBeenNthCalledWith(1, {
      refresh_token: mockInitialTokens.refresh_token
    });
    expect(mockApiClient.refreshToken).toHaveBeenNthCalledWith(2, {
      refresh_token: mockInitialTokens.refresh_token // Same token!
    });

    // ASSERT: Token should still be preserved after second refresh
    const stateAfterSecondRefresh = authStore.core.getState();
    expect(stateAfterSecondRefresh.refresh_token).toBe(mockInitialTokens.refresh_token);
    expect(stateAfterSecondRefresh.access_token).toBe(secondRefreshResponse.access_token);
  });

  it('should NOT throw error when attempting third refresh with preserved token', async () => {
    // This test proves the bug if refresh_token is lost after first refresh

    // ARRANGE: Set up initial session
    authStore.core.getState().updateUser(mockUser);
    await authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    // ACT: Perform first refresh
    await authStore.refreshTokens();

    // Prepare second refresh
    mockApiClient.refreshToken.mockResolvedValueOnce({
      access_token: 'second-access-token',
      expires_in: 900
    });

    // ACT: Perform second refresh
    await authStore.refreshTokens();

    // Prepare third refresh
    mockApiClient.refreshToken.mockResolvedValueOnce({
      access_token: 'third-access-token',
      expires_in: 900
    });

    // ACT & ASSERT: Third refresh should NOT throw "No refresh token available"
    await expect(authStore.refreshTokens()).resolves.not.toThrow();

    // Verify third refresh used the correct token
    expect(mockApiClient.refreshToken).toHaveBeenCalledTimes(3);
    expect(mockApiClient.refreshToken).toHaveBeenNthCalledWith(3, {
      refresh_token: mockInitialTokens.refresh_token
    });
  });

  it('should handle mixed scenario: server omits token, then provides new one', async () => {
    // Real-world scenario: Server behavior changes between requests

    // ARRANGE: Set up initial session
    authStore.core.getState().updateUser(mockUser);
    await authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    // ACT 1: First refresh (server omits refresh_token)
    await authStore.refreshTokens();

    // Verify preserved token
    expect(authStore.core.getState().refresh_token).toBe(mockInitialTokens.refresh_token);

    // ACT 2: Second refresh (server NOW provides new refresh_token)
    const newRefreshToken = 'brand-new-refresh-token-12345';
    mockApiClient.refreshToken.mockResolvedValueOnce({
      access_token: 'second-access-token',
      refresh_token: newRefreshToken, // Server decided to rotate
      expires_in: 900
    });

    await authStore.refreshTokens();

    // ASSERT: Should now use the NEW refresh token
    const stateAfterSecondRefresh = authStore.core.getState();
    expect(stateAfterSecondRefresh.refresh_token).toBe(newRefreshToken);
    expect(stateAfterSecondRefresh.refresh_token).not.toBe(mockInitialTokens.refresh_token);

    // ACT 3: Third refresh (server omits again)
    mockApiClient.refreshToken.mockResolvedValueOnce({
      access_token: 'third-access-token',
      expires_in: 900
    });

    await authStore.refreshTokens();

    // ASSERT: Should preserve the second token (newRefreshToken)
    expect(authStore.core.getState().refresh_token).toBe(newRefreshToken);
    expect(mockApiClient.refreshToken).toHaveBeenNthCalledWith(3, {
      refresh_token: newRefreshToken
    });
  });

  it('should preserve refresh_token in SessionPersistence across page reload simulation', async () => {
    // This simulates the real bug scenario: refresh → page reload → session restore

    // ARRANGE: Set up initial session
    authStore.core.getState().updateUser(mockUser);
    await authStore.core.getState().updateTokens({
      access_token: mockInitialTokens.access_token,
      refresh_token: mockInitialTokens.refresh_token,
      expiresAt: Date.now() + mockInitialTokens.expires_in * 1000
    });

    // ACT 1: Refresh tokens (server omits refresh_token)
    await authStore.refreshTokens();

    // Capture what was saved to SessionPersistence
    const sessionDataAfterRefresh =
      saveSessionSpy.mock.calls[saveSessionSpy.mock.calls.length - 1][0];

    // ASSERT: SessionPersistence should have the original refresh token
    expect(sessionDataAfterRefresh.refreshToken).toBe(mockInitialTokens.refresh_token);

    // ACT 2: Simulate page reload by creating new auth store with saved session data
    mockDatabaseAdapter.loadSession.mockResolvedValueOnce({
      ...sessionDataAfterRefresh,
      expiresAt: Date.now() + 900000 // Still valid
    });

    const config: AuthConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.com',
      appCode: 'test',
      enablePasskeys: true,
      database: mockDatabaseAdapter
    };

    const newAuthStore = createAuthStore(config, mockApiClient);

    // Wait for session restoration to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // ASSERT: New store should have the preserved refresh token
    const restoredState = newAuthStore.core.getState();
    expect(restoredState.refresh_token).toBe(mockInitialTokens.refresh_token);

    // ACT 3: Try to refresh from restored session
    mockApiClient.refreshToken.mockResolvedValueOnce({
      access_token: 'after-reload-access-token',
      expires_in: 900
    });

    // ASSERT: Should be able to refresh successfully
    await expect(newAuthStore.refreshTokens()).resolves.not.toThrow();
    expect(mockApiClient.refreshToken).toHaveBeenCalledWith({
      refresh_token: mockInitialTokens.refresh_token
    });

    newAuthStore.destroy();
  });
});
