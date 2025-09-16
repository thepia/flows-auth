/**
 * BDD Tests for AppCode-based Endpoint Routing
 *
 * These tests prove that authentication functions use the correct endpoints
 * based on the appCode configuration.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the API detection to prevent localhost detection
vi.mock('../../src/utils/api-detection', () => ({
  detectApiServer: vi.fn().mockResolvedValue({
    url: 'https://api.thepia.com',
    type: 'production',
    isHealthy: true
  })
}));

describe('AppCode-based Endpoint Routing (BDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, user: { id: '1', email: 'test@example.com' } })
    });
  });

  describe('GIVEN a client configured with appCode', () => {
    describe('WHEN appCode is "demo"', () => {
      const client = new AuthApiClient({
        apiBaseUrl: 'https://api.thepia.com',
        clientId: 'demo',
        appCode: 'demo',
        domain: 'example.com',
        enablePasskeys: true,
        enableMagicLinks: false
      });

      it('THEN checkEmail should call /demo/check-user endpoint', async () => {
        // WHEN calling checkEmail
        await client.checkEmail('test@example.com');

        // THEN it should use the appCode-based endpoint with GET method and query parameter
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.thepia.com/demo/check-user?email=test%40example.com',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Origin': expect.any(String)
            })
          })
        );
      });

      it('THEN registerUser should call /demo/create-user endpoint', async () => {
        // WHEN calling registerUser
        await client.registerUser({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          acceptedTerms: true,
          acceptedPrivacy: true
        });

        // THEN it should use the appCode-based endpoint
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.thepia.com/demo/create-user',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('test@example.com')
          })
        );
      });

      it('THEN registerOrSignIn should call /demo/send-email endpoint', async () => {
        // WHEN calling registerOrSignIn
        await client.registerOrSignIn('test@example.com');

        // THEN it should use the appCode-based endpoint
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.thepia.com/demo/send-email',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('test@example.com')
          })
        );
      });

      it('THEN startPasswordlessAuthentication should call /demo/send-email endpoint', async () => {
        // WHEN calling startPasswordlessAuthentication
        await client.startPasswordlessAuthentication('test@example.com');

        // THEN it should use the appCode-based endpoint
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.thepia.com/demo/send-email',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('test@example.com')
          })
        );
      });
    });

    describe('WHEN appCode is "app"', () => {
      const client = new AuthApiClient({
        apiBaseUrl: 'https://api.thepia.com',
        clientId: 'app',
        appCode: 'app',
        domain: 'app.thepia.net',
        enablePasskeys: true,
        enableMagicLinks: false
      });

      it('THEN endpoints should use /app/ prefix', async () => {
        // Clear cache to ensure fresh API call
        client.clearUserCache();

        // WHEN calling checkEmail
        await client.checkEmail('test@example.com');

        // THEN it should use the app-specific endpoint with GET method and query parameter
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.thepia.com/app/check-user?email=test%40example.com',
          expect.objectContaining({
            method: 'GET'
          })
        );
      });
    });
  });

  describe('GIVEN a client configured WITHOUT appCode (legacy mode)', () => {
    describe('WHEN appCode is false or undefined', () => {
      const client = new AuthApiClient({
        apiBaseUrl: 'https://api.thepia.com',
        clientId: 'legacy-app',
        appCode: false,
        domain: 'example.com',
        enablePasskeys: true,
        enableMagicLinks: false
      });

      it('THEN checkEmail should call legacy /auth/check-user endpoint', async () => {
        // Clear cache to ensure fresh API call
        client.clearUserCache();

        // WHEN calling checkEmail
        await client.checkEmail('test@example.com');

        // THEN it should use the legacy endpoint with GET method and query parameter
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.thepia.com/auth/check-user?email=test%40example.com',
          expect.objectContaining({
            method: 'GET'
          })
        );
      });

      it('THEN registerUser should call legacy /auth/register endpoint', async () => {
        // WHEN calling registerUser
        await client.registerUser({
          email: 'test@example.com',
          acceptedTerms: true,
          acceptedPrivacy: true
        });

        // THEN it should use the legacy endpoint
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.thepia.com/auth/register',
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });
  });

  describe('GIVEN a client configured with boolean appCode', () => {
    describe('WHEN appCode is true (default to "app")', () => {
      const client = new AuthApiClient({
        apiBaseUrl: 'https://api.thepia.com',
        clientId: 'some-app',
        appCode: true,
        domain: 'example.com',
        enablePasskeys: true,
        enableMagicLinks: false
      });

      it('THEN endpoints should default to /app/ prefix', async () => {
        // Clear cache to ensure fresh API call
        client.clearUserCache();

        // WHEN calling checkEmail
        await client.checkEmail('test@example.com');

        // THEN it should use the default app endpoint with GET method and query parameter
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.thepia.com/app/check-user?email=test%40example.com',
          expect.objectContaining({
            method: 'GET'
          })
        );
      });
    });
  });

  describe('HTTP Method Verification', () => {
    describe('GIVEN any client configuration', () => {
      const client = new AuthApiClient({
        apiBaseUrl: 'https://api.thepia.com',
        clientId: 'demo',
        appCode: 'demo',
        domain: 'example.com',
        enablePasskeys: true,
        enableMagicLinks: false
      });

      it('THEN checkEmail should use GET method (not POST)', async () => {
        // Clear cache to ensure fresh API call
        client.clearUserCache();

        // WHEN calling checkEmail
        await client.checkEmail('test@example.com');

        // THEN it should use GET method for idempotent user checking
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'GET'
          })
        );
      });

      it('THEN registerUser should use POST method', async () => {
        // WHEN calling registerUser
        await client.registerUser({
          email: 'test@example.com',
          acceptedTerms: true,
          acceptedPrivacy: true
        });

        // THEN it should use POST method for state-changing registration
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });
  });
});
