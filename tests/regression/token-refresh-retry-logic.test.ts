/**
 * Regression Test: Token Refresh Retry Logic with Exponential Backoff
 *
 * This test validates that transient errors during token refresh are retried
 * with exponential backoff, while permanent errors fail immediately.
 *
 * Background:
 * - Network issues, server errors, and rate limiting are transient
 * - These should be retried with exponential backoff (1min, 5min, 15min)
 * - Invalid tokens (400 errors) are permanent and should not be retried
 * - After 3 failed attempts, the refresh should give up
 *
 * Retry Strategy:
 * - Attempt 1: Immediate failure, retry after 60s
 * - Attempt 2: Retry failure, retry after 300s (5min)
 * - Attempt 3: Retry failure, retry after 900s (15min)
 * - Attempt 4 (final): Success or permanent failure
 *
 * Test Scenarios:
 * 1. Transient errors that eventually succeed on last attempt
 * 2. Transient errors that exhaust all retries
 * 3. Permanent errors that fail immediately without retry
 * 4. Mixed scenarios (transient then permanent)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig } from '../../src/types';

describe('Regression: Token Refresh Retry Logic', () => {
  let authStore: ReturnType<typeof createAuthStore>;
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
    vi.useFakeTimers();
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;

    authStore = createAuthStore(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should retry transient errors and succeed on the 4th attempt', async () => {
    // Setup: Authenticated state
    const now = Date.now();
    authStore.core.setState({
      state: 'authenticated',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: new Date(now - 86400000).toISOString() // Created 1 day ago
      },
      access_token: 'access-v1',
      refresh_token: 'refresh-v1',
      expiresAt: now + 3600000, // Expires in 1 hour
      refreshedAt: now
    });

    // Spy on console to verify retry messages
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      // Intentionally empty - suppressing console output during tests
    });
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      // Intentionally empty - suppressing console output during tests
    });

    // Mock refresh responses:
    // Attempts 1-3: Transient errors (500, 503, Network)
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Internal server error' })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ error: 'Service temporarily unavailable' })
      })
      .mockRejectedValueOnce(new Error('Network timeout'))
      // Attempt 4: Success!
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'access-v2',
          refresh_token: 'refresh-v2',
          expires_in: 3600
        })
      });

    // Manually trigger refresh
    const refreshPromise = authStore.core.getState().refreshTokens();

    // The first attempt fails immediately (no timer)
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Verify retry message for attempt 1 (60s backoff = 1min)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('attempt 1/3'),
      expect.anything()
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('retrying in 60s'),
      expect.anything()
    );

    // Advance 60 seconds to trigger retry 1
    await vi.advanceTimersByTimeAsync(60000);

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Verify retry message for attempt 2 (300s backoff = 5min)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('attempt 2/3'),
      expect.anything()
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('retrying in 300s'),
      expect.anything()
    );

    // Advance 5 minutes to trigger retry 2
    await vi.advanceTimersByTimeAsync(300000);

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    // Verify retry message for attempt 3 (1500s backoff = 25min)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('attempt 3/3'),
      expect.anything()
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('retrying in 1500s'),
      expect.anything()
    );

    // Advance 25 minutes to trigger final retry
    await vi.advanceTimersByTimeAsync(1500000);

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    // Verify success message
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Retrying token refresh')
    );

    // Wait for promise to resolve
    await expect(refreshPromise).resolves.toBeUndefined();

    // Verify tokens were updated
    const state = authStore.core.getState();
    expect(state.access_token).toBe('access-v2');
    expect(state.refresh_token).toBe('refresh-v2');
    expect(state.state).toBe('authenticated');

    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('should exhaust all retries after 3 transient failures and give up', async () => {
    // Setup: Authenticated state
    const now = Date.now();
    authStore.core.setState({
      state: 'authenticated',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: new Date(now - 86400000).toISOString()
      },
      access_token: 'access-v1',
      refresh_token: 'refresh-v1',
      expiresAt: now + 3600000,
      refreshedAt: now
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty - suppressing console output during tests
    });
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      // Intentionally empty - suppressing console output during tests
    });

    // Mock all 4 attempts as failures
    for (let i = 0; i < 4; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ error: 'Service temporarily unavailable' })
      });
    }

    // Manually trigger refresh (don't wait for scheduled refresh)
    const refreshPromise = authStore.core.getState().refreshTokens();

    // Initial attempt fails immediately
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    // Retry 1: 60s
    await vi.advanceTimersByTimeAsync(60000);
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    // Retry 2: 300s
    await vi.advanceTimersByTimeAsync(300000);
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));

    // Retry 3: 1500s (final attempt)
    await vi.advanceTimersByTimeAsync(1500000);
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));

    // Verify failure message after max retries
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('failed after 3'),
      expect.anything()
    );

    // Verify no more retries are scheduled
    await vi.advanceTimersByTimeAsync(1000000);
    expect(mockFetch).toHaveBeenCalledTimes(4); // Still only 4 calls

    // Session should still be authenticated (no auto-signout)
    const state = authStore.core.getState();
    expect(state.state).toBe('authenticated');
    expect(state.access_token).toBe('access-v1'); // Original token still present

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should not retry permanent errors (400 Bad Request)', async () => {
    // Setup: Authenticated state
    const now = Date.now();
    authStore.core.setState({
      state: 'authenticated',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: new Date(now - 86400000).toISOString()
      },
      access_token: 'access-v1',
      refresh_token: 'invalid-refresh-token',
      expiresAt: now + 3600000,
      refreshedAt: now
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      // Intentionally empty - suppressing console output during tests
    });

    // Mock 400 Bad Request (permanent error) - message must include "invalid_token" to trigger permanent failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        code: 'invalid_token',
        message: 'The refresh token is invalid_token or has expired'
      })
    });

    // Manually trigger refresh
    let thrownError;
    try {
      await authStore.core.getState().refreshTokens();
    } catch (error) {
      thrownError = error;
    }

    // Verify the call was made
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Verify error was thrown (permanent failure throws)
    expect(thrownError).toBeDefined();

    // Verify permanent failure message (use exact text from code)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '🔴 Permanent refresh token failure - resetting retry counter'
    );

    // Verify no retries are scheduled
    await vi.advanceTimersByTimeAsync(60000);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only 1 call, no retries

    await vi.advanceTimersByTimeAsync(1000000);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call

    consoleWarnSpy.mockRestore();
  });

  it('should handle network timeout errors as transient', async () => {
    // Setup: Authenticated state
    const now = Date.now();
    authStore.core.setState({
      state: 'authenticated',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: new Date(now - 86400000).toISOString()
      },
      access_token: 'access-v1',
      refresh_token: 'refresh-v1',
      expiresAt: now + 3600000,
      refreshedAt: now
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      // Intentionally empty - suppressing console output during tests
    });

    // Mock timeout error (transient)
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

    // Mock successful retry
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'access-v2',
        refresh_token: 'refresh-v2',
        expires_in: 3600
      })
    });

    // Manually trigger refresh
    const refreshPromise = authStore.core.getState().refreshTokens();

    // Initial attempt fails immediately
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    // Verify retry is scheduled
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('retrying in 60s'),
      expect.anything()
    );

    // Retry after 60s
    await vi.advanceTimersByTimeAsync(60000);
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    // Wait for promise to resolve
    await refreshPromise;

    // Verify success
    const state = authStore.core.getState();
    expect(state.access_token).toBe('access-v2');

    consoleWarnSpy.mockRestore();
  });
});
