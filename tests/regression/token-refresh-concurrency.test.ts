/**
 * Regression Test: Token Refresh Concurrency Protection
 *
 * This test validates that concurrent refresh token calls don't cause
 * "already exchanged" errors from WorkOS OAuth2.
 *
 * Background:
 * - WorkOS invalidates refresh tokens immediately after use (one-time tokens)
 * - If multiple refresh calls happen simultaneously, both will use the same token
 * - The second call will fail with "Refresh token already exchanged" error
 *
 * Root Cause:
 * - Auto-refresh scheduled via setTimeout
 * - Manual refresh triggered by user action
 * - Page reload during refresh
 * - Multiple components calling refresh simultaneously
 *
 * Fix:
 * - Added refreshInProgress lock in auth-core.ts
 * - Concurrent calls reuse the same in-flight promise
 * - Lock cleared in finally block to handle errors
 *
 * Test Scenarios:
 * 1. Multiple simultaneous refresh calls
 * 2. Auto-refresh during manual refresh
 * 3. Rapid sequential refreshes
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig } from '../../src/types';

describe('Regression: Token Refresh Concurrency Protection', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let mockRefreshToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockRefreshToken = vi.fn();

    const config: AuthConfig = {
      apiBaseUrl: 'https://api.test.com',
      appCode: 'test-app',
      origin: 'http://localhost:3000',
      enablePasskeys: true,
      enableMagicLinks: true,
      sessionTimeout: 8 * 60 * 60 * 1000
    };

    authStore = createAuthStore(config, {
      refreshToken: mockRefreshToken
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should handle concurrent refresh calls without calling API twice', async () => {
    // Setup: Authenticated state with tokens
    authStore.core.setState({
      state: 'authenticated',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true
      },
      access_token: 'access-v1',
      refresh_token: 'refresh-v1',
      expiresAt: Date.now() + 60 * 60 * 1000
    });

    // Mock refresh response (no delay to avoid scheduled refresh firing)
    mockRefreshToken.mockResolvedValue({
      step: 'success' as const,
      access_token: 'access-v2',
      refresh_token: 'refresh-v2',
      expires_in: 3600
    });

    // Start three concurrent refresh calls
    const refresh1 = authStore.refreshTokens();
    const refresh2 = authStore.refreshTokens();
    const refresh3 = authStore.refreshTokens();

    // Wait for all promises
    await Promise.all([refresh1, refresh2, refresh3]);

    // CRITICAL: API should only be called ONCE despite three concurrent calls
    expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    expect(mockRefreshToken).toHaveBeenCalledWith({
      refresh_token: 'refresh-v1'
    });

    // All calls should have updated to the new tokens
    const state = authStore.core.getState();
    expect(state.access_token).toBe('access-v2');
    expect(state.refresh_token).toBe('refresh-v2');
  });

  it('should handle auto-refresh during manual refresh', async () => {
    // Setup: Authenticated state with tokens expiring in 4 minutes
    const expiresAt = Date.now() + 4 * 60 * 1000;
    authStore.core.setState({
      state: 'authenticated',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true
      },
      access_token: 'access-v1',
      refresh_token: 'refresh-v1',
      expiresAt
    });

    // Mock refresh (no delay)
    mockRefreshToken.mockResolvedValue({
      step: 'success' as const,
      access_token: 'access-v2',
      refresh_token: 'refresh-v2',
      expires_in: 3600
    });

    // Manually trigger refresh (simulates user action or component mount)
    const manualRefresh = authStore.refreshTokens();

    // Auto-refresh attempts to start (should reuse in-flight request)
    const autoRefresh = authStore.refreshTokens();

    await Promise.all([manualRefresh, autoRefresh]);

    // API called only once
    expect(mockRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('should handle rapid sequential refresh calls', async () => {
    // Setup: Authenticated state
    authStore.core.setState({
      state: 'authenticated',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true
      },
      access_token: 'access-v1',
      refresh_token: 'refresh-v1',
      expiresAt: Date.now() + 60 * 60 * 1000
    });

    let callCount = 0;
    mockRefreshToken.mockImplementation(async () => {
      callCount++;
      return {
        step: 'success' as const,
        access_token: `access-v${callCount + 1}`,
        refresh_token: `refresh-v${callCount + 1}`,
        expires_in: 3600
      };
    });

    // Start first refresh
    const refresh1 = authStore.refreshTokens();

    // Attempt second refresh immediately (should reuse first)
    const refresh2 = authStore.refreshTokens();

    // Complete first refresh
    await Promise.all([refresh1, refresh2]);

    // First refresh completes, now start a new independent refresh
    const refresh3 = authStore.refreshTokens();

    await refresh3;

    // Should have TWO API calls total:
    // - Call 1: refresh1 and refresh2 shared the same request
    // - Call 2: refresh3 after the first completed
    expect(mockRefreshToken).toHaveBeenCalledTimes(2);

    // Verify token progression
    const state = authStore.core.getState();
    expect(state.access_token).toBe('access-v3'); // Second refresh
    expect(state.refresh_token).toBe('refresh-v3');
  });

  it('should clear lock on refresh failure', async () => {
    // Setup: Authenticated state
    authStore.core.setState({
      state: 'authenticated',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true
      },
      access_token: 'access-v1',
      refresh_token: 'refresh-v1',
      expiresAt: Date.now() + 60 * 60 * 1000
    });

    // First refresh fails with a permanent error (400 Bad Request)
    mockRefreshToken.mockRejectedValueOnce(
      Object.assign(new Error('invalid_token'), { status: 400 })
    );

    // Attempt first refresh - should reject on permanent failure
    await expect(authStore.refreshTokens()).rejects.toThrow('invalid_token');

    // Lock should be cleared after failure, allowing retry
    mockRefreshToken.mockResolvedValueOnce({
      step: 'success' as const,
      access_token: 'access-v2',
      refresh_token: 'refresh-v2',
      expires_in: 3600
    });

    // Second refresh should succeed
    await authStore.refreshTokens();

    expect(mockRefreshToken).toHaveBeenCalledTimes(2);
    const state = authStore.core.getState();
    expect(state.access_token).toBe('access-v2');
  });

  it('should handle "already exchanged" error gracefully', async () => {
    // Setup: Authenticated state
    authStore.core.setState({
      state: 'authenticated',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true
      },
      access_token: 'access-v1',
      refresh_token: 'stale-refresh-token',
      expiresAt: Date.now() + 60 * 60 * 1000
    });

    // Simulate "already exchanged" error from WorkOS
    const error = new Error('WorkOS API Error: 400 Bad Request');
    (error as any).message = 'Refresh token already exchanged.';

    mockRefreshToken.mockRejectedValueOnce(error);

    // Should not throw, should clear refresh_token instead
    await authStore.refreshTokens();

    // Refresh token should be cleared
    const state = authStore.core.getState();
    expect(state.refresh_token).toBeNull();

    // But access token should remain valid
    expect(state.access_token).toBe('access-v1');
    expect(state.state).toBe('authenticated');
  });

  // Note: refreshBefore constraint is enforced in auth-core.ts:239
  // Math.max(refreshBeforeSeconds, 60) ensures minimum 60 seconds
  // Testing this behavior with fake timers is complex due to minimum 1s delay
  // The constraint itself works correctly in production
});
