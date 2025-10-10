/**
 * OAuth2 Token Refresh Compliance Tests
 *
 * Validates RFC 6749 compliance for token refresh flows.
 * References: https://datatracker.ietf.org/doc/html/rfc6749#section-6
 *
 * Key Requirements:
 * - refresh_token sent in request body (NOT headers)
 * - access_token required in response
 * - refresh_token optional in response (token rotation)
 * - expires_in in seconds (NOT milliseconds)
 * - Calculate expiresAt correctly from expires_in
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig, SignInResponse } from '../../src/types';

describe('OAuth2 Token Refresh Compliance (RFC 6749)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let apiClient: AuthApiClient;

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

  describe('RFC 6749 Section 6: Request Format', () => {
    it('should send refresh_token in request body (NOT in Authorization header)', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await apiClient.refreshToken({
        refresh_token: 'old-refresh-token'
      });

      // Verify fetch was called with correct format
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-app/refresh',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            refresh_token: 'old-refresh-token'
          })
        })
      );

      // Verify refresh_token is NOT in Authorization header
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers;
      expect(headers.Authorization).toBeUndefined();
    });

    it('should use POST method for token refresh', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        access_token: 'new-access-token',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await apiClient.refreshToken({
        refresh_token: 'test-refresh-token'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('RFC 6749 Section 6: Response Format', () => {
    it('should require access_token in response', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        access_token: 'new-access-token-12345',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.refreshToken({
        refresh_token: 'old-refresh-token'
      });

      expect(result.access_token).toBeDefined();
      expect(typeof result.access_token).toBe('string');
      expect(result.access_token).toBe('new-access-token-12345');
    });

    it('should handle optional refresh_token in response (token rotation)', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        access_token: 'new-access-token',
        refresh_token: 'rotated-refresh-token', // New refresh token provided
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.refreshToken({
        refresh_token: 'old-refresh-token'
      });

      expect(result.refresh_token).toBe('rotated-refresh-token');
    });

    it('should handle missing refresh_token in response (no rotation)', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        access_token: 'new-access-token',
        // No refresh_token - server doesn't rotate
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.refreshToken({
        refresh_token: 'old-refresh-token'
      });

      // Response should not have refresh_token if server doesn't rotate
      expect(result.refresh_token).toBeUndefined();
    });

    it('should receive expires_in as seconds (RFC 6749 standard)', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        access_token: 'new-access-token',
        expires_in: 3600 // 1 hour in seconds
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.refreshToken({
        refresh_token: 'test-refresh-token'
      });

      expect(result.expires_in).toBe(3600);
      expect(typeof result.expires_in).toBe('number');

      // Verify it's in seconds, not milliseconds
      // A reasonable token expiry is between 5 minutes and 24 hours
      expect(result.expires_in).toBeGreaterThanOrEqual(300); // 5 minutes
      expect(result.expires_in).toBeLessThanOrEqual(86400); // 24 hours
    });

    it('should handle optional expires_in (defaults to reasonable value)', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token'
        // No expires_in provided
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.refreshToken({
        refresh_token: 'test-refresh-token'
      });

      // expires_in is optional per OAuth2 spec
      expect(result.expires_in).toBeUndefined();
    });
  });

  describe('Store Layer: OAuth2 Token Processing', () => {
    let authStore: ReturnType<typeof createAuthStore>;
    let mockApiClient: any;

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      createdAt: new Date().toISOString()
    };

    beforeEach(() => {
      mockApiClient = {
        refreshToken: vi.fn(),
        config: {
          apiBaseUrl: 'https://api.test.com',
          domain: 'test.com',
          appCode: 'test-app'
        }
      };

      authStore = createAuthStore(mockConfig, mockApiClient);

      // Set up initial authenticated state
      authStore.core.getState().updateUser(mockUser);
      authStore.core.getState().updateTokens({
        access_token: 'initial-access-token',
        refresh_token: 'initial-refresh-token',
        expiresAt: Date.now() + 900000 // 15 minutes
      });
    });

    afterEach(() => {
      authStore.destroy();
    });

    it('should calculate expiresAt correctly from expires_in (seconds to milliseconds)', async () => {
      const nowBefore = Date.now();

      mockApiClient.refreshToken.mockResolvedValueOnce({
        step: 'success',
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600 // 1 hour in seconds
      });

      await authStore.refreshTokens();

      const nowAfter = Date.now();
      const coreState = authStore.core.getState();

      expect(coreState.expiresAt).toBeDefined();

      // expiresAt should be approximately now + (expires_in * 1000)
      const expectedMin = nowBefore + (3600 * 1000);
      const expectedMax = nowAfter + (3600 * 1000);

      expect(coreState.expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(coreState.expiresAt).toBeLessThanOrEqual(expectedMax);
    });

    it('should reuse old refresh_token when server does not rotate', async () => {
      mockApiClient.refreshToken.mockResolvedValueOnce({
        step: 'success',
        access_token: 'new-access-token',
        // No refresh_token in response
        expires_in: 3600
      });

      await authStore.refreshTokens();

      const coreState = authStore.core.getState();

      // Should keep the old refresh token
      expect(coreState.refresh_token).toBe('initial-refresh-token');
      expect(coreState.access_token).toBe('new-access-token');
    });

    it('should update to new refresh_token when server rotates tokens', async () => {
      mockApiClient.refreshToken.mockResolvedValueOnce({
        step: 'success',
        access_token: 'new-access-token',
        refresh_token: 'rotated-refresh-token', // Server provides new token
        expires_in: 3600
      });

      await authStore.refreshTokens();

      const coreState = authStore.core.getState();

      // Should use the new refresh token
      expect(coreState.refresh_token).toBe('rotated-refresh-token');
      expect(coreState.access_token).toBe('new-access-token');
    });

    it('should handle missing expires_in gracefully', async () => {
      mockApiClient.refreshToken.mockResolvedValueOnce({
        step: 'success',
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token'
        // No expires_in
      });

      await authStore.refreshTokens();

      const coreState = authStore.core.getState();

      // Should set expiresAt to null when expires_in is missing
      expect(coreState.expiresAt).toBeNull();
      expect(coreState.access_token).toBe('new-access-token');
    });

    it('should convert various expires_in formats correctly', async () => {
      const testCases = [
        { expires_in: 900, expectedMs: 900000 },      // 15 minutes
        { expires_in: 3600, expectedMs: 3600000 },    // 1 hour
        { expires_in: 7200, expectedMs: 7200000 },    // 2 hours
        { expires_in: 86400, expectedMs: 86400000 }   // 24 hours
      ];

      for (const testCase of testCases) {
        const nowBefore = Date.now();

        mockApiClient.refreshToken.mockResolvedValueOnce({
          step: 'success',
          access_token: 'new-access-token',
          expires_in: testCase.expires_in
        });

        await authStore.refreshTokens();

        const coreState = authStore.core.getState();
        const actualDuration = coreState.expiresAt! - nowBefore;

        // Allow 100ms tolerance for test execution time
        expect(actualDuration).toBeGreaterThanOrEqual(testCase.expectedMs - 100);
        expect(actualDuration).toBeLessThanOrEqual(testCase.expectedMs + 100);
      }
    });
  });

  describe('OAuth2 Error Responses', () => {
    it('should handle invalid_grant error (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({
          error: 'invalid_grant',
          error_description: 'Refresh token is invalid or expired'
        })
      });

      await expect(
        apiClient.refreshToken({ refresh_token: 'invalid-token' })
      ).rejects.toThrow();
    });

    it('should handle server error maintaining OAuth2 semantics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({
          error: 'server_error',
          error_description: 'Token refresh temporarily unavailable'
        })
      });

      await expect(
        apiClient.refreshToken({ refresh_token: 'test-token' })
      ).rejects.toThrow();
    });
  });
});
