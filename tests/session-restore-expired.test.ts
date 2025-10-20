/**
 * Session Restoration with Expired Token Test
 *
 * Tests that when a session is loaded from storage with an expired access token
 * but a valid refresh token, the system:
 * 1. Restores the session
 * 2. Automatically refreshes the token
 * 3. Updates the stored session with new tokens
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../src/stores/auth-store';
import type { AuthConfig } from '../src/types';
import type { SessionData, SessionPersistence } from '../src/types/database';
import { createMockSessionPersistence } from './helpers/session-persistence-mock';

describe('Session Restoration with Expired Token', () => {
  let mockDatabase: SessionPersistence;
  let storedSession: SessionData | null;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    // Create a mock database adapter that stores session in memory
    storedSession = null;
    mockDatabase = createMockSessionPersistence();

    // Mock fetch for API calls
    mockFetch = vi.fn() as any;
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should NOT restore session when access token is expired and no refresh token exists', async () => {
    const expiredSession: SessionData = {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      accessToken: 'expired_access_token',
      refreshToken: '', // No refresh token
      expiresAt: Date.now() - 1000, // Expired 1 second ago
      authMethod: 'email-code'
    };

    // Create mock with initial session
    mockDatabase = createMockSessionPersistence({ initialSession: expiredSession });

    const config: AuthConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.com',
      clientId: 'test-client',
      enablePasskeys: false,
      enableMagicLinks: false,
      database: mockDatabase
    };

    const store = createAuthStore(config);

    // Wait for async session initialization and clearing
    await vi.waitFor(() => {
      const state = store.core.getState();
      // Should not be authenticated because token is expired and no refresh token
      expect(state.isAuthenticated()).toBe(false);
      // Session should be cleared
      expect(mockDatabase.clearSession).toHaveBeenCalled();
    });
  });

  it('should restore session and refresh token when access token is expired but refresh token exists', async () => {
    const expiredSession: SessionData = {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      accessToken: 'expired_access_token',
      refreshToken: 'valid_refresh_token',
      expiresAt: Date.now() - 1000, // Expired 1 second ago
      authMethod: 'email-code'
    };

    // Create mock with initial session
    mockDatabase = createMockSessionPersistence({ initialSession: expiredSession });

    // Mock successful token refresh response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600
      })
    });

    const config: AuthConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.com',
      clientId: 'test-client',
      enablePasskeys: false,
      enableMagicLinks: false,
      database: mockDatabase
    };

    const store = createAuthStore(config);

    // Wait for async session restoration and token refresh
    await vi.waitFor(
      () => {
        const state = store.core.getState();
        // Should be authenticated after refresh
        expect(state.isAuthenticated()).toBe(true);
        expect(state.access_token).toBe('new_access_token');
        expect(state.refresh_token).toBe('new_refresh_token');
      },
      { timeout: 5000 }
    );

    // Verify refresh endpoint was called
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('valid_refresh_token')
      })
    );

    // Verify session was updated in storage with new tokens
    expect(mockDatabase.saveSession).toHaveBeenCalled();

    // Get the last saved session from the mock spy
    const saveSpy = mockDatabase.saveSession as any;
    const saveCallArgs = saveSpy.mock.calls[saveSpy.mock.calls.length - 1];
    const savedSession = saveCallArgs?.[0];
    expect(savedSession?.accessToken).toBe('new_access_token');
    expect(savedSession?.refreshToken).toBe('new_refresh_token');
  });

  it('should sign out if token refresh fails after restoring expired session', async () => {
    const expiredSession: SessionData = {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      accessToken: 'expired_access_token',
      refreshToken: 'invalid_refresh_token',
      expiresAt: Date.now() - 1000,
      authMethod: 'email-code'
    };

    // Create mock with initial session
    mockDatabase = createMockSessionPersistence({ initialSession: expiredSession });

    // Mock failed token refresh response with a permanent failure (not "already exchanged")
    // Use 400 Bad Request with invalid_token to trigger permanent failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'invalid_token',
        message: 'Invalid or malformed token'
      })
    });

    const config: AuthConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.com',
      clientId: 'test-client',
      enablePasskeys: false,
      enableMagicLinks: false,
      database: mockDatabase
    };

    const store = createAuthStore(config);

    // Wait for async session restoration, failed refresh, and sign out
    await vi.waitFor(
      () => {
        const state = store.core.getState();
        // Should NOT be authenticated after failed refresh
        expect(state.isAuthenticated()).toBe(false);
        // Verify session was cleared after failed refresh
        expect(mockDatabase.clearSession).toHaveBeenCalled();
      },
      { timeout: 5000 }
    );
  });

  it('should restore session normally when access token is still valid', async () => {
    const validSession: SessionData = {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      accessToken: 'valid_access_token',
      refreshToken: 'valid_refresh_token',
      expiresAt: Date.now() + 3600 * 1000, // Expires in 1 hour
      authMethod: 'email-code'
    };

    // Create mock with initial session
    mockDatabase = createMockSessionPersistence({ initialSession: validSession });

    const config: AuthConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.com',
      clientId: 'test-client',
      enablePasskeys: false,
      enableMagicLinks: false,
      database: mockDatabase
    };

    const store = createAuthStore(config);

    // Wait for async session restoration
    await vi.waitFor(() => {
      const state = store.core.getState();
      // Should be authenticated with original tokens
      expect(state.isAuthenticated()).toBe(true);
      expect(state.access_token).toBe('valid_access_token');
      expect(state.refresh_token).toBe('valid_refresh_token');
    });

    // Verify NO refresh was attempted (token is still valid)
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
