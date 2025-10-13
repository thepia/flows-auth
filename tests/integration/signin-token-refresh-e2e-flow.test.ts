/**
 * End-to-End Token Refresh Flow Test (Backend Mock)
 *
 * Tests the AuthApiClient layer with a mocked backend server.
 * Simulates a complete OAuth2 token refresh flow:
 * 1. Sign in and receive tokens
 * 2. Use tokens for authenticated requests
 * 3. Refresh tokens before expiry
 * 4. Handle token rotation
 *
 * Uses fetch mocking to simulate backend responses.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig, SignInResponse } from '../../src/types';

describe('E2E: SignIn and Token Refresh Flow (Backend Mock)', () => {
  let apiClient: AuthApiClient;
  let mockFetch: ReturnType<typeof vi.fn>;

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

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    apiClient = new AuthApiClient(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full OAuth2 token refresh flow with token rotation', async () => {
    const userEmail = 'test@example.com';

    // ===== PHASE 1: Check if email exists =====
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          exists: true,
          hasWebAuthn: false,
          userId: 'user-123'
        })
    });

    const checkResult = await apiClient.checkEmail(userEmail);
    expect(checkResult.exists).toBe(true);

    // ===== PHASE 2: Send email code =====
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          message: 'Verification code sent',
          timestamp: Date.now()
        })
    });

    await apiClient.sendAppEmailCode(userEmail);

    // ===== PHASE 3: Verify email code and receive tokens =====
    const signInResponse: SignInResponse = {
      step: 'success',
      user: {
        id: 'user-123',
        email: userEmail,
        name: 'Test User',
        emailVerified: true,
        createdAt: new Date().toISOString()
      },
      access_token: 'initial-access-token-v1',
      refresh_token: 'initial-refresh-token-v1',
      expires_in: 900 // 15 minutes
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(signInResponse)
    });

    const verifyResult = await apiClient.verifyAppEmailCode(userEmail, '123456');

    // Verify we received tokens with OAuth2 naming
    expect(verifyResult.access_token).toBe('initial-access-token-v1');
    expect(verifyResult.refresh_token).toBe('initial-refresh-token-v1');
    expect(verifyResult.expires_in).toBe(900);

    const initialTokens = {
      access_token: verifyResult.access_token!,
      refresh_token: verifyResult.refresh_token!,
      expires_in: verifyResult.expires_in!
    };

    // ===== PHASE 4: Use access token for authenticated request =====
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        })
    });

    // Store access token (in real app, this would be in auth store)
    localStorage.setItem('auth_access_token', initialTokens.access_token);

    const profile = await apiClient.getProfile();

    // Verify authenticated request used access token
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/test-app/profile',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${initialTokens.access_token}`
        })
      })
    );

    // ===== PHASE 5: First token refresh (server rotates tokens) =====
    const firstRefreshResponse: SignInResponse = {
      step: 'success',
      access_token: 'refreshed-access-token-v2',
      refresh_token: 'refreshed-refresh-token-v2', // Server rotates token
      expires_in: 900
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(firstRefreshResponse)
    });

    const firstRefresh = await apiClient.refreshToken({
      refresh_token: initialTokens.refresh_token
    });

    // Verify refresh request
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/test-app/refresh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          refresh_token: initialTokens.refresh_token
        })
      })
    );

    // Verify OAuth2 response format
    expect(firstRefresh).toMatchObject({
      access_token: 'refreshed-access-token-v2',
      refresh_token: 'refreshed-refresh-token-v2',
      expires_in: 900
    });

    // ===== PHASE 6: Second token refresh (uses rotated token) =====
    const secondRefreshResponse: SignInResponse = {
      step: 'success',
      access_token: 'refreshed-access-token-v3',
      refresh_token: 'refreshed-refresh-token-v3', // Another rotation
      expires_in: 900
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(secondRefreshResponse)
    });

    const secondRefresh = await apiClient.refreshToken({
      refresh_token: firstRefresh.refresh_token! // Use NEW token from first refresh
    });

    // Verify second refresh used the rotated token from first refresh
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/test-app/refresh',
      expect.objectContaining({
        body: JSON.stringify({
          refresh_token: 'refreshed-refresh-token-v2' // From first refresh
        })
      })
    );

    expect(secondRefresh.refresh_token).toBe('refreshed-refresh-token-v3');

    // ===== PHASE 7: Refresh without token rotation =====
    const noRotationResponse: SignInResponse = {
      step: 'success',
      access_token: 'refreshed-access-token-v4',
      // No refresh_token - server doesn't rotate this time
      expires_in: 900
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(noRotationResponse)
    });

    const thirdRefresh = await apiClient.refreshToken({
      refresh_token: secondRefresh.refresh_token!
    });

    // When server doesn't rotate, client should reuse old refresh token
    expect(thirdRefresh.access_token).toBe('refreshed-access-token-v4');
    expect(thirdRefresh.refresh_token).toBeUndefined(); // Not in response

    // ===== PHASE 8: Sign out =====
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({})
    });

    await apiClient.signOut({
      access_token: thirdRefresh.access_token!,
      refresh_token: secondRefresh.refresh_token // Use last known refresh token
    });

    // Verify sign out request
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/test-app/signout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          access_token: 'refreshed-access-token-v4',
          refresh_token: 'refreshed-refresh-token-v3'
        })
      })
    );

    localStorage.clear();
  });

  it('should handle token refresh with various expires_in values', async () => {
    const testCases = [
      { expires_in: 300, description: '5 minutes' },
      { expires_in: 900, description: '15 minutes' },
      { expires_in: 3600, description: '1 hour' },
      { expires_in: 86400, description: '24 hours' }
    ];

    for (const { expires_in, description } of testCases) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            step: 'success',
            access_token: `access-token-${expires_in}`,
            refresh_token: `refresh-token-${expires_in}`,
            expires_in
          })
      });

      const result = await apiClient.refreshToken({
        refresh_token: 'test-refresh-token'
      });

      // Verify expires_in is in seconds (OAuth2 standard)
      expect(result.expires_in).toBe(expires_in);
      expect(typeof result.expires_in).toBe('number');

      // Verify it's reasonable duration (not milliseconds)
      expect(result.expires_in).toBeGreaterThanOrEqual(60); // At least 1 minute
      expect(result.expires_in).toBeLessThanOrEqual(86400); // At most 24 hours
    }
  });

  it('should handle refresh token errors correctly', async () => {
    // Test invalid/expired refresh token (401)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () =>
        Promise.resolve({
          error: 'invalid_grant',
          error_description: 'Refresh token is invalid or expired'
        })
    });

    await expect(apiClient.refreshToken({ refresh_token: 'invalid-token' })).rejects.toThrow();

    // Test "already exchanged" error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () =>
        Promise.resolve({
          error: 'invalid_grant',
          error_description: 'Refresh token already exchanged'
        })
    });

    await expect(apiClient.refreshToken({ refresh_token: 'already-used-token' })).rejects.toThrow();

    // Test server error (should allow retry)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: () =>
        Promise.resolve({
          error: 'temporarily_unavailable',
          error_description: 'Token refresh temporarily unavailable'
        })
    });

    await expect(apiClient.refreshToken({ refresh_token: 'test-token' })).rejects.toThrow();
  });

  it('should maintain OAuth2 compliance throughout refresh cycles', async () => {
    const refreshCycles = 5;
    let currentRefreshToken = 'initial-refresh-token';

    for (let i = 1; i <= refreshCycles; i++) {
      const newRefreshToken = `refresh-token-generation-${i}`;
      const newAccessToken = `access-token-generation-${i}`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            step: 'success',
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            expires_in: 900
          })
      });

      const result = await apiClient.refreshToken({
        refresh_token: currentRefreshToken
      });

      // Verify OAuth2 fields
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('expires_in');

      // Verify snake_case naming (OAuth2 standard)
      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).not.toHaveProperty('expiresIn');

      // Verify request used previous refresh token
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            refresh_token: currentRefreshToken
          })
        })
      );

      // Update for next cycle
      currentRefreshToken = newRefreshToken;
    }

    // Verify we went through all rotations
    expect(currentRefreshToken).toBe(`refresh-token-generation-${refreshCycles}`);
  });

  it('should handle malformed refresh responses', async () => {
    // Missing access_token
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          step: 'success',
          refresh_token: 'new-refresh-token',
          expires_in: 900
          // Missing access_token
        })
    });

    const result1 = await apiClient.refreshToken({
      refresh_token: 'test-token'
    });

    // Should still return response (even though invalid)
    expect(result1.access_token).toBeUndefined();

    // Missing expires_in (optional per OAuth2)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          step: 'success',
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token'
          // Missing expires_in (optional)
        })
    });

    const result2 = await apiClient.refreshToken({
      refresh_token: 'test-token'
    });

    expect(result2.access_token).toBe('new-access-token');
    expect(result2.expires_in).toBeUndefined();
  });

  it('should automatically refresh tokens at correct time and use rotated refresh_token', async () => {
    // Enable fake timers for this test
    vi.useFakeTimers();

    // Mock API client for auth store
    const mockRefreshToken = vi.fn();
    const mockApiClient = {
      refreshToken: mockRefreshToken,
      config: {
        apiBaseUrl: 'https://api.test.com',
        domain: 'test.com',
        appCode: 'test-app'
      }
    } as Partial<AuthApiClient> as AuthApiClient;

    const authStore = createAuthStore(mockConfig, mockApiClient);

    try {
      // ===== PHASE 1: Simulate sign-in with 1 hour token expiry =====
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        createdAt: new Date().toISOString()
      };

      const initialTokens = {
        access_token: 'initial-access-token',
        refresh_token: 'initial-refresh-token-v1',
        expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
      };

      // Update core store with authenticated state
      authStore.core.getState().updateUser(mockUser);
      await authStore.core.getState().updateTokens(initialTokens);

      // Emit sign_in_success to trigger session saving (simulates real sign-in flow)
      authStore.events.getState().emit('sign_in_success', {
        user: mockUser,
        method: 'email-code'
      });

      // Verify initial state in core store
      expect(authStore.core.getState().refresh_token).toBe('initial-refresh-token-v1');

      // ===== PHASE 2: Advance time by 50 minutes - NO refresh should happen yet =====
      vi.advanceTimersByTime(50 * 60 * 1000); // 50 minutes
      expect(mockRefreshToken).not.toHaveBeenCalled();

      // ===== PHASE 3: Advance to 55 minutes (5 min before expiry) - AUTO REFRESH triggers =====
      const firstRefreshResponse = {
        step: 'success' as const,
        access_token: 'auto-refreshed-access-token-v2',
        refresh_token: 'auto-refreshed-refresh-token-v2', // NEW rotated token
        expires_in: 3600 // Another 1 hour
      };

      mockRefreshToken.mockImplementation(async () => firstRefreshResponse);

      // Advance 5 more minutes to trigger scheduled refresh
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();

      // Verify first auto-refresh was called with ORIGINAL refresh token
      expect(mockRefreshToken).toHaveBeenCalledWith({
        refresh_token: 'initial-refresh-token-v1'
      });

      // Verify tokens were updated in core store
      const stateAfterFirstRefresh = authStore.core.getState();
      expect(stateAfterFirstRefresh.access_token).toBe('auto-refreshed-access-token-v2');
      expect(stateAfterFirstRefresh.refresh_token).toBe('auto-refreshed-refresh-token-v2');

      // ===== PHASE 4: Second auto-refresh uses the ROTATED refresh token =====
      mockRefreshToken.mockClear();

      const secondRefreshResponse = {
        step: 'success' as const,
        access_token: 'second-auto-refresh-access-v3',
        refresh_token: 'second-auto-refresh-refresh-v3', // Third generation token
        expires_in: 3600
      };

      mockRefreshToken.mockImplementation(async () => secondRefreshResponse);

      // Advance another 55 minutes to trigger second auto-refresh
      await vi.advanceTimersByTimeAsync(55 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();

      // CRITICAL TEST: Verify second refresh used the ROTATED token from first refresh
      expect(mockRefreshToken).toHaveBeenCalledWith({
        refresh_token: 'auto-refreshed-refresh-token-v2' // From first refresh, NOT original!
      });

      // Verify third generation tokens in state
      const stateAfterSecondRefresh = authStore.core.getState();
      expect(stateAfterSecondRefresh.access_token).toBe('second-auto-refresh-access-v3');
      expect(stateAfterSecondRefresh.refresh_token).toBe('second-auto-refresh-refresh-v3');

      // ===== PHASE 5: Third auto-refresh validates the continuous loop =====
      mockRefreshToken.mockClear();

      const thirdRefreshResponse = {
        step: 'success' as const,
        access_token: 'third-auto-refresh-access-v4',
        refresh_token: 'third-auto-refresh-refresh-v4', // Fourth generation token
        expires_in: 3600
      };

      mockRefreshToken.mockImplementation(async () => thirdRefreshResponse);

      // Advance another 55 minutes to trigger third auto-refresh
      await vi.advanceTimersByTimeAsync(55 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();

      // Verify third refresh used the v3 token from second refresh
      expect(mockRefreshToken).toHaveBeenCalledWith({
        refresh_token: 'second-auto-refresh-refresh-v3' // From second refresh, proving continuous loop!
      });

      // Verify fourth generation tokens in state
      const stateAfterThirdRefresh = authStore.core.getState();
      expect(stateAfterThirdRefresh.access_token).toBe('third-auto-refresh-access-v4');
      expect(stateAfterThirdRefresh.refresh_token).toBe('third-auto-refresh-refresh-v4');
    } finally {
      // Clean up
      authStore.destroy();
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
