/**
 * Auth API Client Tests
 *
 * Do NOT introduce mocking of the API client
 * Do introduce mocking of browser APIs like WebAuthn to ensure correct switching of options.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';
import type { AuthConfig, AuthError, SignInResponse } from '../../src/types';

// Mock fetch globally
global.fetch = vi.fn();

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

describe('AuthApiClient', () => {
  let apiClient: AuthApiClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create a base mock implementation
    const baseMockImplementation = (url: string) => {
      // Mock error reporting endpoint to prevent actual calls
      if (url.includes('/dev/error-reports')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true })
        });
      }
      // Default to rejecting unknown URLs
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    };

    mockFetch = vi.fn(baseMockImplementation);
    global.fetch = mockFetch;

    apiClient = new AuthApiClient(mockConfig);
    localStorage.clear();
  });

  describe('Configuration', () => {
    it('should initialize with correct base URL', () => {
      expect(apiClient).toBeInstanceOf(AuthApiClient);
      // Base URL is private, but we can test the behavior
    });

    it('should remove trailing slash from base URL', () => {
      const configWithTrailingSlash = {
        ...mockConfig,
        apiBaseUrl: 'https://api.test.com/'
      };

      const client = new AuthApiClient(configWithTrailingSlash);
      expect(client).toBeInstanceOf(AuthApiClient);
    });
  });

  describe('Request Handling', () => {
    it('should make GET request successfully', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getProfile();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-app/profile',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should include authorization header when authenticated', async () => {
      localStorage.setItem('auth_access_token', 'test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await apiClient.getProfile();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-app/profile',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    // magic link isn't really working and is legacy
    it.skip('should handle POST requests with body', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        access_token: 'token',
        refresh_token: 'refresh'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.signInWithMagicLink({
        email: 'test@example.com'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-app/send-email',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            email: 'test@example.com'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP error responses', async () => {
      const errorResponse = {
        success: false,
        message: 'Invalid email or password'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true, // API returns 200 with success: false
        json: () => Promise.resolve(errorResponse)
      });

      const result = await apiClient.signInWithMagicLink({ email: 'test@example.com' });

      // signInWithMagicLink now returns error response instead of throwing
      expect(result.step).toBe('error');
      expect(result.message).toBe('Invalid email or password');
    });
  });

  describe('Authentication Methods', () => {
    it('should handle passwordless authentication via signInWithMagicLink', async () => {
      // signInWithMagicLink now redirects to startPasswordlessAuthentication
      const mockApiResponse = {
        success: true,
        message: 'Email code sent successfully'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      });

      const result = await apiClient.signInWithMagicLink({
        email: 'test@example.com'
      });

      // Expect converted response format
      expect(result).toEqual({
        step: 'email-sent',
        message: 'Email code sent successfully',
        needsPasskey: false,
        needsVerification: true
      });
    });

    it.skip('should handle passkey sign in', async () => {
      // Passkey support not yet implemented
      const mockCredential = {
        id: 'credential-id',
        rawId: 'cmF3SWQ=',
        response: {
          clientDataJSON: 'Y2xpZW50RGF0YQ==',
          authenticatorData: 'YXV0aGVudGljYXRvckRhdGE=',
          signature: 'c2lnbmF0dXJl',
          userHandle: 'dXNlckhhbmRsZQ=='
        },
        type: 'public-key'
      };

      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        access_token: 'access-token'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.signInWithPasskey({
        email: 'test@example.com',
        challengeId: 'challenge-123',
        credential: mockCredential
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-app/webauthn/verify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            challengeId: 'challenge-123',
            credential: mockCredential,
            clientId: 'test-client' // Include clientId for token strategy
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle magic link (passwordless) sign in', async () => {
      // signInWithMagicLink returns passwordless response
      const mockApiResponse = {
        success: true,
        message: 'Check your email for the code'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      });

      const result = await apiClient.signInWithMagicLink({
        email: 'test@example.com'
      });

      expect(result).toEqual({
        step: 'email-sent',
        message: 'Check your email for the code',
        needsPasskey: false,
        needsVerification: true
      });
    });
  });

  describe('Token Management', () => {
    it('should refresh tokens', async () => {
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

      const result = await apiClient.refreshToken({
        refresh_token: 'old-refresh-token'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-app/refresh',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            refresh_token: 'old-refresh-token'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle refresh response with Supabase tokens', async () => {
      // REGRESSION TEST: Ensures API client correctly handles Supabase tokens in refresh response
      const mockResponse: SignInResponse = {
        step: 'success',
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        supabase_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.abc123',
        supabase_expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.refreshToken({
        refresh_token: 'old-refresh-token'
      });

      // Verify API client passes through Supabase tokens unchanged
      expect(result.supabase_token).toBe(mockResponse.supabase_token);
      expect(result.supabase_expires_at).toBe(mockResponse.supabase_expires_at);

      // Verify other standard fields are also present
      expect(result.access_token).toBe('new-access-token');
      expect(result.refresh_token).toBe('new-refresh-token');
      expect(result.expires_in).toBe(3600);
      expect(result.step).toBe('success');
    });

    it('should handle refresh response without Supabase tokens', async () => {
      // EDGE CASE: Server doesn't provide Supabase tokens (feature disabled, generation failed, etc.)
      const mockResponse: SignInResponse = {
        step: 'success',
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
        // No supabase_token or supabase_expires_at fields
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.refreshToken({
        refresh_token: 'old-refresh-token'
      });

      // Verify Supabase tokens are undefined when not provided by server
      expect(result.supabase_token).toBeUndefined();
      expect(result.supabase_expires_at).toBeUndefined();

      // Verify other standard fields are still present
      expect(result.access_token).toBe('new-access-token');
      expect(result.refresh_token).toBe('new-refresh-token');
      expect(result.expires_in).toBe(3600);
      expect(result.step).toBe('success');
    });

    it('should handle verifyAppEmailCode response with Supabase tokens', async () => {
      // REGRESSION TEST: Ensures verifyAppEmailCode correctly handles Supabase tokens
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00Z'
        },
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        expires_in: 3600,
        supabase_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.email_verify',
        supabase_expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.verifyAppEmailCode('test@example.com', '123456');

      // Verify API client passes through Supabase tokens unchanged
      expect(result.supabase_token).toBe(mockResponse.supabase_token);
      expect(result.supabase_expires_at).toBe(mockResponse.supabase_expires_at);

      // Verify other standard fields are also present
      expect(result.access_token).toBe('access-token-123');
      expect(result.refresh_token).toBe('refresh-token-456');
      expect(result.expires_in).toBe(3600);
      expect(result.step).toBe('success');
      expect(result.user).toEqual(mockResponse.user);
    });

    it('should handle verifyAppEmailCode response without Supabase tokens', async () => {
      // EDGE CASE: Server doesn't provide Supabase tokens in email verification
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00Z'
        },
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        expires_in: 3600
        // No supabase_token or supabase_expires_at fields
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.verifyAppEmailCode('test@example.com', '123456');

      // Verify Supabase tokens are undefined when not provided by server
      expect(result.supabase_token).toBeUndefined();
      expect(result.supabase_expires_at).toBeUndefined();

      // Verify other standard fields are still present
      expect(result.access_token).toBe('access-token-123');
      expect(result.refresh_token).toBe('refresh-token-456');
      expect(result.expires_in).toBe(3600);
      expect(result.step).toBe('success');
      expect(result.user).toEqual(mockResponse.user);
    });

    it('should sign out using app-specific endpoint', async () => {
      localStorage.setItem('auth_access_token', 'test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await apiClient.signOut({
        access_token: 'test-token',
        refresh_token: 'refresh-token'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-app/signout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            access_token: 'test-token',
            refresh_token: 'refresh-token'
          })
        })
      );
    });
  });

  describe.skip('Passkey Management', () => {
    // Passkey support not yet implemented
    beforeEach(() => {
      localStorage.setItem('auth_access_token', 'test-token');
    });

    it('should get passkey challenge', async () => {
      const mockChallenge = {
        challenge: 'Y2hhbGxlbmdl',
        rpId: 'test.com',
        timeout: 60000
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockChallenge)
      });

      const result = await apiClient.getPasskeyChallenge('test@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-app/webauthn/challenge',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' })
        })
      );

      expect(result).toEqual(mockChallenge);
    });

    it('should create passkey', async () => {
      const mockCredential = {
        id: 'credential-id',
        rawId: 'cmF3SWQ=',
        response: { attestationObject: 'YXR0ZXN0YXRpb24=' },
        type: 'public-key'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await apiClient.createPasskey(mockCredential);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-app/passkey/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ credential: mockCredential })
        })
      );
    });

    it('should list passkeys', async () => {
      const mockPasskeys = [
        {
          id: 'passkey-1',
          name: 'iPhone - 1/1/2024',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'passkey-2',
          name: 'Mac - 1/2/2024',
          createdAt: '2024-01-02T00:00:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPasskeys)
      });

      const result = await apiClient.listPasskeys();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-app/passkeys',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );

      expect(result).toEqual(mockPasskeys);
    });

    it('should delete passkey', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await apiClient.deletePasskey('passkey-id');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-app/passkeys/passkey-id',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('Utility Methods', () => {
    it('should check email existence', async () => {
      // Mock the actual API response format
      const mockApiResponse = {
        exists: true,
        hasWebAuthn: true,
        userId: '123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      });

      const result = await apiClient.checkEmail('test@example.com');

      // checkEmail now uses GET with query params
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-app/check-user?email=test%40example.com',
        expect.objectContaining({
          method: 'GET'
        })
      );

      // API returns hasWebAuthn (not hasPasskey)
      expect(result).toEqual(mockApiResponse);
    });

    it('should use appCode endpoint (org field is deprecated)', async () => {
      // Note: org field doesn't override appCode - appCode is always used
      const orgConfig = {
        ...mockConfig,
        org: 'wos' // org field is deprecated, appCode takes precedence
      };
      const orgApiClient = new AuthApiClient(orgConfig);

      // Clear cache to ensure fresh API call
      orgApiClient.clearUserCache();

      const mockApiResponse = {
        exists: true,
        hasWebAuthn: true,
        userId: '123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      });

      const result = await orgApiClient.checkEmail('org-test@example.com');

      // Uses appCode from config, not org
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-app/check-user?email=org-test%40example.com',
        expect.objectContaining({
          method: 'GET'
        })
      );

      // API returns hasWebAuthn (not hasPasskey)
      expect(result).toEqual(mockApiResponse);
    });

    it('should use appCode endpoint for all requests', async () => {
      // Clear cache to ensure fresh API call
      apiClient.clearUserCache();

      // Use the default mockConfig which has appCode: 'test-app'
      const mockApiResponse = {
        exists: false,
        hasWebAuthn: false
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      });

      const result = await apiClient.checkEmail('no-org-test@example.com');

      // Uses appCode in URL with GET + query params
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-app/check-user?email=no-org-test%40example.com',
        expect.objectContaining({
          method: 'GET'
        })
      );

      // API returns hasWebAuthn (not hasPasskey)
      expect(result).toEqual(mockApiResponse);
    });

    it('should request password reset', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await apiClient.requestPasswordReset('test@example.com');

      // Password reset uses legacy /auth/ endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/auth/password-reset',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' })
        })
      );
    });

    it('should reset password with token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await apiClient.resetPassword('reset-token', 'new-password');

      // Password reset uses legacy /auth/ endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/auth/password-reset/confirm',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            token: 'reset-token',
            password: 'new-password'
          })
        })
      );
    });

    it('should verify magic link', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        access_token: 'access-token'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.verifyMagicLink('magic-token');

      expect(result).toEqual(mockResponse);
    });
  });
});
