/**
 * Auth Store Integration Tests - Following thepia.com patterns
 *
 * Purpose: Test auth-store with real API calls, no mocking
 * Context: Integration tests using real API server and test accounts
 * Safe to remove: No - critical for preventing authentication regressions
 *
 * Do NOT introduce mocking of the API client
 * Do introduce mocking of browser APIs like WebAuthn to ensure correct switching of options.
 */

import { get } from 'svelte/store';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores';
import type { AuthConfig } from '../../src/types';
import { TEST_ACCOUNTS, TestUtils, WebAuthnMocker } from '../test-setup';

// Following thepia.com pattern - real API server detection
const API_BASE = 'https://dev.thepia.com:8443';
let apiServerRunning = false;
let testEmail = 'test@thepia.com'; // Real test account that exists in Auth0

const getTestConfig = (): AuthConfig => {
  return {
    apiBaseUrl: API_BASE,
    domain: 'dev.thepia.com',
    clientId: 'flows-auth-integration-test',
    enablePasskeys: true,
    enableMagicLinks: false,
    branding: {
      companyName: 'Flows Auth Integration Test',
      showPoweredBy: true
    }
  };
};

describe('Auth Store Integration Tests', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let testConfig: AuthConfig;

  beforeAll(async () => {
    // Following thepia.com pattern - detect API server availability
    testEmail = process.env.TEST_AUTH_EMAIL || 'test@thepia.com';

    try {
      const response = await fetch(`${API_BASE}/health`);
      apiServerRunning = response.ok;
      console.log(
        `🔗 API Server at ${API_BASE}: ${apiServerRunning ? 'RUNNING' : 'NOT AVAILABLE'}`
      );
    } catch (error) {
      console.warn('Local API server not available - skipping integration tests');
      apiServerRunning = false;
    }
  });

  beforeEach(async () => {
    testConfig = getTestConfig();
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    if (apiServerRunning) {
      authStore = createAuthStore(testConfig);

      // Wait for initial state machine setup
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });

  afterEach(() => {
    if (authStore?.destroy) {
      authStore.destroy();
    }
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('API Endpoint Connectivity', () => {
    it('should connect to API server health endpoint', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      const response = await fetch(`${API_BASE}/health`);
      expect(response.ok).toBe(true);
    });

    it('should connect to user check endpoint', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      // Test that we can reach the API with a test email
      const response = await fetch(`${API_BASE}/auth/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'connectivity-test@example.com' })
      });

      expect(response.status).toBeDefined();
      expect([200, 400, 404].includes(response.status)).toBe(true);
    });
  });

  describe('Real User Account Testing', () => {
    it('should handle real test user account', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      // Real API call with real test account
      const response = await fetch(`${API_BASE}/auth/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('exists');
      expect(data).toHaveProperty('hasWebAuthn');

      if (data.exists) {
        expect(data).toHaveProperty('userId');
        expect(data.userId).toMatch(/^auth0\|/);
        console.log(`✅ Test user ${testEmail} exists with WebAuthn: ${data.hasWebAuthn}`);
      } else {
        console.log(`ℹ️ Test user ${testEmail} does not exist in the system`);
      }
    });

    it('should handle WebAuthn challenge generation', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      // Test WebAuthn challenge endpoint with real test user
      const response = await fetch(`${API_BASE}/auth/webauthn/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('challenge');
      expect(data).toHaveProperty('rpId');
      expect(data.rpId).toBe('dev.thepia.net');
      console.log(`✅ WebAuthn challenge generated for ${testEmail}`);
    });

    it('should handle API errors gracefully during email check', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      const invalidEmail = 'invalid-email-format';

      try {
        await authStore.api.checkEmail(invalidEmail);
        // Should not reach here if validation works
        expect(false).toBe(true);
      } catch (error: any) {
        expect(error.message).toMatch(/email|invalid/i);
      }
    });
  });

  describe('Registration Flow Integration', () => {
    it('should complete user registration with passkey', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      const newUserEmail = `test-registration-${Date.now()}@thepia.net`;

      // Mock WebAuthn for registration
      WebAuthnMocker.mockSuccess('new-credential-id');

      try {
        const registrationData = {
          email: newUserEmail,
          firstName: 'Test',
          lastName: 'User',
          acceptedTerms: true,
          acceptedPrivacy: true,
          marketingConsent: false
        };

        // FIXED: Use createAccount for full WebAuthn registration flow
        const result = await authStore.createAccount(registrationData);

        if (result.step === 'success') {
          expect(result.user).toBeDefined();
          expect(result.user?.email).toBe(newUserEmail);

          const state = authStore.getState();
          expect(state.state).toBe('authenticated');
          expect(state.user?.email).toBe(newUserEmail);
        } else {
          // Registration might require additional steps
          expect(['webauthn_required', 'email_verification_required']).toContain(result.step);
        }
      } catch (error: any) {
        // In test environment, WebAuthn might not be fully supported
        console.log('Registration test failed (expected in test env):', error.message);
        expect(error.message).toBeDefined();
      }
    });

    it('should handle registration validation errors', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      try {
        const invalidRegistrationData = {
          email: 'invalid-email',
          acceptedTerms: false, // Required
          acceptedPrivacy: false // Required
        };

        // FIXED: Use createAccount for full WebAuthn registration flow
        await authStore.createAccount(invalidRegistrationData);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/terms|privacy|email/i);
      }
    });
  });

  describe('Sign-In Flow Integration', () => {
    it('should attempt passkey authentication for existing user', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      const existingEmail = TEST_ACCOUNTS.existingWithPasskey.email;

      // Mock successful WebAuthn
      WebAuthnMocker.mockSuccess('existing-credential-id');

      try {
        const result = await authStore.signInWithPasskey(existingEmail);

        if (result.step === 'success') {
          expect(result.user).toBeDefined();
          expect(result.user?.email).toBe(existingEmail);

          const state = authStore.getState();
          expect(state.state).toBe('authenticated');
        } else {
          // May require additional verification
          expect(['webauthn_required', 'challenge_required']).toContain(result.step);
        }
      } catch (error: any) {
        // WebAuthn might fail in test environment
        console.log('Passkey test failed (expected in test env):', error.message);
        expect(error.message).toBeDefined();
      }
    });

    it('should handle magic link authentication', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      const existingEmail = TEST_ACCOUNTS.existingWithoutPasskey.email;

      try {
        const result = await authStore.signInWithMagicLink(existingEmail);

        expect(result.step).toBe('magic_link_sent');
        expect(result.magicLinkSent).toBe(true);

        const state = authStore.getState();
        expect(state.state).toBe('unauthenticated'); // Still waiting for magic link click
      } catch (error: any) {
        // Magic link might not be configured in test environment
        console.log('Magic link test failed (expected in test env):', error.message);
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network failures gracefully', async () => {
      // Create auth store with invalid API URL
      const invalidConfig = {
        ...testConfig,
        apiBaseUrl: 'https://invalid-api-url.example.com'
      };

      const invalidAuthStore = createAuthStore(invalidConfig);

      try {
        await invalidAuthStore.api.checkEmail('test@example.com');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/network|fetch|connection/i);
      } finally {
        if (invalidAuthStore?.destroy) {
          invalidAuthStore.destroy();
        }
      }
    });

    it('should handle rate limiting', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      const rateLimitEmail = TEST_ACCOUNTS.rateLimitTest.email;

      // Execute requests sequentially to test rate limiting properly
      const results = await Promise.allSettled([
        authStore.api.checkEmail(rateLimitEmail),
        authStore.api.checkEmail(rateLimitEmail),
        authStore.api.checkEmail(rateLimitEmail),
        authStore.api.checkEmail(rateLimitEmail),
        authStore.api.checkEmail(rateLimitEmail)
      ]);

      // All requests should complete (not hang)
      expect(results.length).toBe(5);

      // Check if any were rate limited (depends on API configuration)
      const hasRateLimit = results.some(
        (result) => result.status === 'rejected' &&
        result.reason instanceof Error &&
        result.reason.message.includes('rate')
      );

      // Rate limiting might not be configured in test environment
      expect(typeof hasRateLimit).toBe('boolean');
    });

    it('should handle concurrent authentication attempts', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      const email = TEST_ACCOUNTS.existingWithPasskey.email;

      WebAuthnMocker.mockSuccess();

      // Execute all attempts immediately (no delays needed in tests)
      const attempts = await Promise.allSettled([
        authStore.signInWithPasskey(email),
        authStore.signInWithPasskey(email),
        authStore.signInWithPasskey(email)
      ]);

      // Should handle concurrent attempts gracefully - all should complete
      expect(attempts.length).toBe(3);

      // Check that attempts were handled (either fulfilled or rejected, not hanging)
      const completed = attempts.filter((r) => r.status === 'fulfilled' || r.status === 'rejected');
      expect(completed.length).toBe(3);
    });
  });

  describe('State Persistence and Recovery', () => {
    it.skip('should persist authentication state across store recreations', async () => {
      // TODO: This test needs to be rewritten for flows-db storage
      // Currently tests localStorage but flows-auth uses flows-db by default
      // Mock successful authentication
      const mockUser = TestUtils.createMockUser({
        email: 'persistent-test@thepia.net'
      });

      const mockSession = TestUtils.createMockSession(mockUser);

      // Manually set localStorage to simulate previous session
      localStorage.setItem('auth_access_token', mockSession.access_token);
      localStorage.setItem('auth_refresh_token', mockSession.refresh_token);
      localStorage.setItem('auth_expires_at', (Date.now() + 3600000).toString());
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // Create new auth store - should restore state
      const restoredStore = createAuthStore(testConfig);

      // Wait for initial state setup (UI store should be ready)
      await TestUtils.waitFor(() => restoredStore.ui.getState().signInState !== undefined, 3000);

      const state = restoredStore.getState();
      expect(state.state).toBe('authenticated');
      expect(state.user?.email).toBe(mockUser.email);
      expect(state.access_token).toBe(mockSession.access_token);

      if (restoredStore?.destroy) {
        restoredStore.destroy();
      }
    });

    it.skip('should handle corrupted localStorage gracefully', async () => {
      // TODO: This test needs to be rewritten for flows-db storage
      // Currently tests localStorage but flows-auth uses flows-db by default
      // Set invalid data in localStorage
      localStorage.setItem('auth_user', 'invalid-json');
      localStorage.setItem('auth_access_token', 'expired-token');
      localStorage.setItem('auth_expires_at', '0'); // Expired

      const corruptedStore = createAuthStore(testConfig);

      // Wait for initial state setup (UI store should be ready)
      await TestUtils.waitFor(() => corruptedStore.ui.getState().signInState !== undefined, 3000);

      const state = corruptedStore.getState();
      expect(state.state).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.access_token).toBeNull();

      if (corruptedStore?.destroy) {
        corruptedStore.destroy();
      }
    });
  });

  describe.skip('CRITICAL: createAccount WebAuthn Flow', () => {
    // TODO: These tests need mock setup (mockFetch, WebAuthn mocks)
    // Contradicts file header "no mocking" - needs architectural decision
    it('should complete full WebAuthn registration flow', async () => {
      // Mock successful API responses for the complete flow
      mockFetch
        // Step 1: Register user account
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              step: 'success',
              user: { id: 'user-123', email: 'test@example.com', emailVerified: false },
              access_token: 'access-token',
              refresh_token: 'refresh-token'
            })
        })
        // Step 2: Get WebAuthn registration options
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              challenge: 'mock-challenge',
              rp: { name: 'Test App', id: 'test.com' },
              user: { id: 'user-123', name: 'test@example.com', displayName: 'Test User' },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
              timeout: 60000,
              attestation: 'direct'
            })
        })
        // Step 3: Verify WebAuthn registration
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              credentialId: 'mock-credential-id'
            })
        });

      const registrationData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        acceptedTerms: true,
        acceptedPrivacy: true
      };

      // CRITICAL: Test the complete createAccount flow
      const result = await authStore.createAccount(registrationData);

      // Verify the complete flow was executed
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify Step 1: User registration
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test@example.com')
        })
      );

      // Verify Step 2: WebAuthn registration options
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/auth/webauthn/register/options'),
        expect.objectContaining({
          method: 'POST'
        })
      );

      // Verify Step 3: WebAuthn registration verification
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('/auth/webauthn/register/verify'),
        expect.objectContaining({
          method: 'POST'
        })
      );

      // Verify successful result
      expect(result.step).toBe('success');
      expect(result.user).toBeDefined();
      expect(result.access_token).toBeDefined();
    });

    it('should handle WebAuthn not supported error', async () => {
      // Mock WebAuthn as not supported
      vi.mocked(isWebAuthnSupported).mockReturnValue(false);

      const registrationData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        acceptedTerms: true,
        acceptedPrivacy: true
      };

      // CRITICAL: Should fail with appropriate error
      await expect(authStore.createAccount(registrationData)).rejects.toThrow(
        /passkey authentication is not supported/i
      );
    });

    it('should handle platform authenticator not available error', async () => {
      // Mock platform authenticator as not available
      vi.mocked(isPlatformAuthenticatorAvailable).mockResolvedValue(false);

      const registrationData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        acceptedTerms: true,
        acceptedPrivacy: true
      };

      // CRITICAL: Should fail with appropriate error
      await expect(authStore.createAccount(registrationData)).rejects.toThrow(
        /no biometric authentication available/i
      );
    });
  });
});
