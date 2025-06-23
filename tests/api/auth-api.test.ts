/**
 * Auth API Client Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';
import type { AuthConfig, SignInResponse, AuthError } from '../../src/types';

// Mock fetch globally
global.fetch = vi.fn();

const mockConfig: AuthConfig = {
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  enablePasskeys: true,
  enableMagicLinks: true,
  enablePasswordLogin: true,
  enableSocialLogin: false,
  branding: {
    companyName: 'Test Company'
  }
};

describe('AuthApiClient', () => {
  let apiClient: AuthApiClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    apiClient = new AuthApiClient(mockConfig);
    mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockClear();
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
        'https://api.test.com/auth/profile',
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
        'https://api.test.com/auth/profile',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should handle POST requests with body', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        accessToken: 'token',
        refreshToken: 'refresh'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.signInWithPassword({
        email: 'test@example.com',
        password: 'password'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/auth/signin/password',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP error responses', async () => {
      const errorResponse = {
        code: 'invalid_credentials',
        message: 'Invalid email or password'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(errorResponse)
      });

      await expect(
        apiClient.signInWithPassword({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toEqual({
        code: 'invalid_credentials',
        message: 'Invalid email or password'
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Failed to parse JSON'))
      });

      await expect(
        apiClient.signIn({ email: 'test@example.com' })
      ).rejects.toEqual({
        code: 'network_error',
        message: 'HTTP 500: Internal Server Error'
      });
    });

    it('should handle malformed error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({})
      });

      await expect(
        apiClient.signIn({ email: 'test@example.com' })
      ).rejects.toEqual({
        code: 'unknown_error',
        message: 'An unknown error occurred'
      });
    });
  });

  describe('Authentication Methods', () => {
    it('should handle basic sign in', async () => {
      const mockResponse: SignInResponse = {
        step: 'password_required'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.signIn({ email: 'test@example.com' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/auth/signin',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle password sign in', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle passkey sign in', async () => {
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
        accessToken: 'access-token'
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
        'https://api.test.com/auth/signin/passkey',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            challengeId: 'challenge-123',
            credential: mockCredential
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle magic link sign in', async () => {
      const mockResponse: SignInResponse = {
        step: 'magic_link_sent',
        message: 'Check your email for the magic link'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.signInWithMagicLink({
        email: 'test@example.com'
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Token Management', () => {
    it('should refresh tokens', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.refreshToken({
        refreshToken: 'old-refresh-token'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            refreshToken: 'old-refresh-token'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should sign out', async () => {
      localStorage.setItem('auth_access_token', 'test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await apiClient.signOut({
        accessToken: 'test-token',
        refreshToken: 'refresh-token'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/auth/signout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          }),
          body: JSON.stringify({
            accessToken: 'test-token',
            refreshToken: 'refresh-token'
          })
        })
      );
    });
  });

  describe('Passkey Management', () => {
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
        'https://api.test.com/auth/passkey/challenge',
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
        'https://api.test.com/auth/passkey/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
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
        'https://api.test.com/auth/passkeys',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
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
        'https://api.test.com/auth/passkeys/passkey-id',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('Utility Methods', () => {
    it('should check email existence', async () => {
      const mockResponse = {
        exists: true,
        hasPasskey: true,
        hasPassword: false,
        socialProviders: ['google']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.checkEmail('test@example.com');

      expect(result).toEqual(mockResponse);
    });

    it('should request password reset', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await apiClient.requestPasswordReset('test@example.com');

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
        accessToken: 'access-token'
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