/**
 * Unit Test: Stale Token Overwrite Protection
 *
 * Verifies that updateTokens() rejects token updates with earlier expiry times
 * to prevent multi-tab race conditions from overwriting fresh tokens with stale ones.
 *
 * See: docs/architecture/SESSION_SYNC_STRATEGY.md - Problem 3
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthCoreStore } from '../../src/stores/core/auth-core';
import type { AuthConfig, StoreOptions } from '../../src/stores/types';

describe('Stale Token Overwrite Protection', () => {
  let authCore: ReturnType<typeof createAuthCoreStore>;
  let mockApiClient: any;
  let mockDb: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true,
    createdAt: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API client
    mockApiClient = {
      config: {
        apiBaseUrl: 'https://api.test.com',
        domain: 'test.com',
        appCode: 'test'
      },
      signOut: vi.fn().mockResolvedValue(undefined),
      refreshToken: vi.fn().mockResolvedValue({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        expires_in: 3600
      })
    };

    // Mock database adapter
    mockDb = {
      saveSession: vi.fn().mockResolvedValue(undefined),
      loadSession: vi.fn().mockResolvedValue(null),
      clearSession: vi.fn().mockResolvedValue(undefined),
      saveUser: vi.fn().mockResolvedValue(undefined),
      loadUser: vi.fn().mockResolvedValue(null),
      getUser: vi.fn().mockResolvedValue(null),
      clearUser: vi.fn().mockResolvedValue(undefined)
    };

    const config: AuthConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.com',
      appCode: 'test',
      enablePasskeys: true
    };

    const options: StoreOptions = {
      config,
      api: mockApiClient,
      db: mockDb
    };

    authCore = createAuthCoreStore(options);
  });

  it('should accept tokens with later expiry time', async () => {
    const now = Date.now();

    // Set initial state with tokens expiring in 10 minutes
    authCore.getState().updateUser(mockUser);
    await authCore.getState().updateTokens({
      access_token: 'old-token',
      refresh_token: 'old-refresh',
      expiresAt: now + 10 * 60 * 1000 // Expires in 10 minutes
    });

    const saveCountBefore = mockDb.saveSession.mock.calls.length;

    // Update with tokens expiring in 15 minutes (fresher)
    await authCore.getState().updateTokens({
      access_token: 'new-token',
      refresh_token: 'new-refresh',
      expiresAt: now + 15 * 60 * 1000 // Expires in 15 minutes
    });

    // Should have saved the new tokens
    expect(mockDb.saveSession.mock.calls.length).toBeGreaterThan(saveCountBefore);
    expect(authCore.getState().access_token).toBe('new-token');
    expect(authCore.getState().refresh_token).toBe('new-refresh');
  });

  it('should reject tokens with earlier expiry time (stale tokens)', async () => {
    const now = Date.now();

    // Set initial state with tokens expiring in 15 minutes
    authCore.getState().updateUser(mockUser);
    await authCore.getState().updateTokens({
      access_token: 'fresh-token',
      refresh_token: 'fresh-refresh',
      expiresAt: now + 15 * 60 * 1000 // Expires in 15 minutes
    });

    const saveCountBefore = mockDb.saveSession.mock.calls.length;
    const tokenBefore = authCore.getState().access_token;
    const refreshBefore = authCore.getState().refresh_token;

    // Try to update with tokens expiring in 10 minutes (stale)
    await authCore.getState().updateTokens({
      access_token: 'stale-token',
      refresh_token: 'stale-refresh',
      expiresAt: now + 10 * 60 * 1000 // Expires in 10 minutes (earlier!)
    });

    // Should NOT have saved or updated tokens
    expect(mockDb.saveSession.mock.calls.length).toBe(saveCountBefore);
    expect(authCore.getState().access_token).toBe(tokenBefore);
    expect(authCore.getState().refresh_token).toBe(refreshBefore);
  });

  it('should accept tokens with same expiry time (edge case)', async () => {
    const now = Date.now();
    const expiryTime = now + 15 * 60 * 1000;

    // Set initial state
    authCore.getState().updateUser(mockUser);
    await authCore.getState().updateTokens({
      access_token: 'token-1',
      refresh_token: 'refresh-1',
      expiresAt: expiryTime
    });

    const saveCountBefore = mockDb.saveSession.mock.calls.length;

    // Update with tokens with same expiry (not strictly stale)
    await authCore.getState().updateTokens({
      access_token: 'token-2',
      refresh_token: 'refresh-2',
      expiresAt: expiryTime // Same expiry time
    });

    // Should accept tokens with same expiry (guard uses < not <=)
    expect(mockDb.saveSession.mock.calls.length).toBeGreaterThan(saveCountBefore);
    expect(authCore.getState().access_token).toBe('token-2');
  });

  it('should accept tokens when current state has no expiry', async () => {
    // Set initial state WITHOUT expiry time
    authCore.getState().updateUser(mockUser);
    await authCore.getState().updateTokens({
      access_token: 'old-token',
      refresh_token: 'old-refresh',
      expiresAt: null // No expiry
    });

    const saveCountBefore = mockDb.saveSession.mock.calls.length;

    // Update with tokens that have expiry
    await authCore.getState().updateTokens({
      access_token: 'new-token',
      refresh_token: 'new-refresh',
      expiresAt: Date.now() + 15 * 60 * 1000
    });

    // Should accept (guard only applies when both have expiry)
    expect(mockDb.saveSession.mock.calls.length).toBeGreaterThan(saveCountBefore);
    expect(authCore.getState().access_token).toBe('new-token');
  });

  it('should accept tokens when incoming tokens have no expiry', async () => {
    const now = Date.now();

    // Set initial state with expiry
    authCore.getState().updateUser(mockUser);
    await authCore.getState().updateTokens({
      access_token: 'old-token',
      refresh_token: 'old-refresh',
      expiresAt: now + 15 * 60 * 1000
    });

    const saveCountBefore = mockDb.saveSession.mock.calls.length;

    // Update with tokens that have NO expiry
    await authCore.getState().updateTokens({
      access_token: 'new-token',
      refresh_token: 'new-refresh',
      expiresAt: null // No expiry (server didn't provide expires_in)
    });

    // Should accept (guard only applies when both have expiry)
    expect(mockDb.saveSession.mock.calls.length).toBeGreaterThan(saveCountBefore);
    expect(authCore.getState().access_token).toBe('new-token');
  });

  it('should prevent multi-tab concurrent refresh race scenario', async () => {
    const now = Date.now();

    // Simulate Tab A and Tab B both starting with same tokens
    authCore.getState().updateUser(mockUser);
    await authCore.getState().updateTokens({
      access_token: 'shared-token',
      refresh_token: 'token-v1',
      expiresAt: now + 5 * 60 * 1000 // Expiring soon
    });

    // Tab A successfully refreshes and gets new tokens
    await authCore.getState().updateTokens({
      access_token: 'tab-a-token',
      refresh_token: 'token-v2',
      expiresAt: now + 15 * 60 * 1000 // Fresh tokens
    });

    expect(authCore.getState().access_token).toBe('tab-a-token');
    expect(authCore.getState().refresh_token).toBe('token-v2');

    const saveCountBefore = mockDb.saveSession.mock.calls.length;

    // Tab B's refresh fails (token already used) but still tries to update with old tokens
    await authCore.getState().updateTokens({
      access_token: 'tab-b-token',
      refresh_token: 'token-v1', // Old token!
      expiresAt: now + 5 * 60 * 1000 // Stale expiry
    });

    // Guard should prevent Tab B from overwriting Tab A's fresh tokens
    expect(mockDb.saveSession.mock.calls.length).toBe(saveCountBefore);
    expect(authCore.getState().access_token).toBe('tab-a-token');
    expect(authCore.getState().refresh_token).toBe('token-v2');
  });

  it('should log warning when rejecting stale tokens', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const now = Date.now();

    // Set fresh tokens
    authCore.getState().updateUser(mockUser);
    await authCore.getState().updateTokens({
      access_token: 'fresh-token',
      refresh_token: 'fresh-refresh',
      expiresAt: now + 15 * 60 * 1000
    });

    // Try to update with stale tokens
    await authCore.getState().updateTokens({
      access_token: 'stale-token',
      refresh_token: 'stale-refresh',
      expiresAt: now + 10 * 60 * 1000
    });

    // Should have logged warning
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Rejecting token update'),
      expect.objectContaining({
        currentExpiresAt: expect.any(String),
        incomingExpiresAt: expect.any(String)
      })
    );

    consoleWarnSpy.mockRestore();
  });
});
