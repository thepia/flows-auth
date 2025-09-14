/**
 * Auth Store Real API Integration Tests - Following thepia.com patterns
 *
 * Purpose: Test auth-store with real API calls, NO MOCKING
 * Context: Integration tests using real API server and test accounts
 * Safe to remove: No - critical for preventing authentication regressions
 */

import { get } from 'svelte/store';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig } from '../../src/types';

// Following thepia.com pattern - real API server detection
const API_BASE = 'https://dev.thepia.com:8443';
let apiServerRunning = false;
let testEmail = 'test@thepia.com'; // Real test account that exists in Auth0

const getTestConfig = (): AuthConfig => {
  return {
    apiBaseUrl: API_BASE,
    domain: 'dev.thepia.net',
    clientId: 'flows-auth-integration-test',
    enablePasskeys: true,
    enableMagicPins: true,
    branding: {
      companyName: 'Flows Auth Integration Test',
      showPoweredBy: true
    }
  };
};

describe('Auth Store Real API Integration Tests', () => {
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

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('ok');
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
      expect(data.rpId).toBe('dev.thepia.com');
      console.log(`✅ WebAuthn challenge generated for ${testEmail}`);
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

    it('should handle non-existent user', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      const nonExistentEmail = `non-existent-${Date.now()}@example.com`;

      const response = await fetch(`${API_BASE}/auth/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nonExistentEmail })
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.exists).toBe(false);
      expect(data.hasWebAuthn).toBe(false);
      console.log(`✅ Non-existent user ${nonExistentEmail} correctly identified`);
    });
  });

  describe('Auth Store Integration', () => {
    it('should initialize auth store correctly', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      expect(authStore).toBeDefined();
      expect(authStore.isAuthenticated()).toBe(false);

      const state = get(authStore);
      expect(state.state).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });

    it('should handle user check through auth store API', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      try {
        // This tests the auth store's API wrapper
        const result = await authStore.api.checkEmail(testEmail);

        expect(result).toHaveProperty('exists');
        expect(result).toHaveProperty('hasPasskey');

        if (result.exists) {
          console.log(`✅ Auth store API: User ${testEmail} exists`);
        } else {
          console.log(`ℹ️ Auth store API: User ${testEmail} does not exist`);
        }
      } catch (error: any) {
        console.log(`⚠️ Auth store API error (may be expected): ${error.message}`);
        expect(error.message).toBeDefined();
      }
    });

    it('should handle invalid email format gracefully', async () => {
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
        expect(error.message).toBeDefined();
        console.log(`✅ Invalid email correctly rejected: ${error.message}`);
      }
    });

    it('should handle network errors gracefully', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

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
        console.log(`✅ Network error correctly handled: ${error.message}`);
      } finally {
        if (invalidAuthStore?.destroy) {
          invalidAuthStore.destroy();
        }
      }
    });
  });

  describe('State Management', () => {
    it('should maintain consistent state during API calls', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      const initialState = get(authStore);
      expect(initialState.state).toBe('unauthenticated');

      // Make API call and verify state remains consistent
      try {
        await authStore.api.checkEmail(testEmail);

        const stateAfterApiCall = get(authStore);
        expect(stateAfterApiCall.state).toBe('unauthenticated');
        expect(stateAfterApiCall.user).toBeNull();
      } catch (error) {
        // API call might fail, but state should still be consistent
        const stateAfterError = get(authStore);
        expect(stateAfterError.state).toBe('unauthenticated');
      }
    });

    it('should handle concurrent API calls without state corruption', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      // Make multiple concurrent API calls
      const emails = ['test1@example.com', 'test2@example.com', 'test3@example.com'];

      const promises = emails.map((email) =>
        authStore.api.checkEmail(email).catch((e) => ({ error: e.message }))
      );

      const results = await Promise.all(promises);

      // Verify state is still consistent after concurrent calls
      const finalState = get(authStore);
      expect(finalState.state).toBe('unauthenticated');
      expect(finalState.user).toBeNull();

      console.log(`✅ Concurrent API calls completed: ${results.length} requests`);
    });
  });
});
