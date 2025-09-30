import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';
import type { AuthConfig } from '../../src/types';
import { globalUserCache } from '../../src/utils/user-cache';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('AuthApiClient - Cache Clearing on Pin Verification', () => {
  let apiClient: AuthApiClient;
  let mockConfig: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    globalUserCache.clearAll();

    mockConfig = {
      apiBaseUrl: 'https://api.test.com',
      appCode: 'test-app',
      enablePasskeys: true,
      enableMagicLinks: false
    };

    apiClient = new AuthApiClient(mockConfig);
  });

  describe('verifyAppEmailCode cache clearing', () => {
    it('should clear user cache when pin verification succeeds for previously non-existent user', async () => {
      const email = 'newuser@example.com';
      const code = '123456';

      // First, simulate a checkEmail call that caches user as non-existent
      const mockCheckResponse = {
        exists: false,
        hasWebAuthn: false,
        userId: undefined,
        emailVerified: false
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCheckResponse
      });

      // Call checkEmail to populate cache with "user doesn't exist"
      await apiClient.checkEmail(email);

      // Verify cache contains the "doesn't exist" entry
      const cachedResult = globalUserCache.get(email);
      expect(cachedResult).toBeTruthy();
      expect(cachedResult?.exists).toBe(false);

      // Now simulate successful pin verification that creates the user
      const mockVerifyResponse = {
        success: true,
        user: {
          id: 'new-user-123',
          email: email,
          name: 'New User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresIn: 3600
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVerifyResponse
      });

      // Call verifyAppEmailCode
      const result = await apiClient.verifyAppEmailCode(email, code);

      // Verify the response is correct
      expect(result.step).toBe('success');
      expect(result.user?.id).toBe('new-user-123');
      expect(result.accessToken).toBe('access-token-123');

      // CRITICAL ASSERTION: Cache should be cleared after successful verification
      const cachedResultAfterVerification = globalUserCache.get(email);
      expect(cachedResultAfterVerification).toBeNull();
    });

    it('should clear user cache when pin verification succeeds for any user', async () => {
      const email = 'existing@example.com';
      const code = '654321';

      // Simulate existing user in cache
      globalUserCache.set(email, {
        exists: true,
        hasPasskey: true
      });

      // Verify cache contains the entry
      expect(globalUserCache.get(email)).toBeTruthy();

      // Mock successful verification response
      const mockVerifyResponse = {
        success: true,
        user: {
          id: 'existing-user-456',
          email: email,
          name: 'Existing User',
          emailVerified: true
        },
        accessToken: 'access-token-456',
        refreshToken: 'refresh-token-456',
        expiresIn: 3600
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVerifyResponse
      });

      // Call verifyAppEmailCode
      await apiClient.verifyAppEmailCode(email, code);

      // Cache should be cleared regardless of previous state
      expect(globalUserCache.get(email)).toBeNull();
    });

    it('should not clear cache when pin verification fails', async () => {
      const email = 'test@example.com';
      const code = 'invalid';

      // Set up cache entry
      globalUserCache.set(email, {
        exists: false,
        hasPasskey: false
      });

      // Mock failed verification response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Invalid code'
        })
      });

      // Call verifyAppEmailCode and expect it to throw
      await expect(apiClient.verifyAppEmailCode(email, code)).rejects.toThrow('Invalid code');

      // Cache should NOT be cleared on failure
      expect(globalUserCache.get(email)).toBeTruthy();
    });

    it('should handle network errors without clearing cache', async () => {
      const email = 'test@example.com';
      const code = '123456';

      // Set up cache entry
      globalUserCache.set(email, {
        exists: true,
        hasPasskey: false
      });

      // Mock network error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      // Call verifyAppEmailCode and expect it to throw
      await expect(apiClient.verifyAppEmailCode(email, code)).rejects.toThrow();

      // Cache should NOT be cleared on network error
      expect(globalUserCache.get(email)).toBeTruthy();
    });
  });

  describe('cache clearing behavior edge cases', () => {
    it('should handle clearing cache for email that was not cached', async () => {
      const email = 'uncached@example.com';
      const code = '123456';

      // Verify no cache entry exists
      expect(globalUserCache.get(email)).toBeNull();

      // Mock successful verification
      const mockVerifyResponse = {
        success: true,
        user: {
          id: 'user-789',
          email: email,
          name: 'Uncached User',
          emailVerified: true
        },
        accessToken: 'access-token-789',
        expiresIn: 3600
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVerifyResponse
      });

      // Should not throw error even if cache entry doesn't exist
      const result = await apiClient.verifyAppEmailCode(email, code);
      expect(result.step).toBe('success');

      // Cache should still be empty (clearing non-existent entry is safe)
      expect(globalUserCache.get(email)).toBeNull();
    });
  });
});
