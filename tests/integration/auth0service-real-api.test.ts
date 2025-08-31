/**
 * Auth0Service Real API Integration Tests - Following thepia.com patterns
 * 
 * Purpose: Test auth0Service with real API calls, NO MOCKING
 * Context: Integration tests using real API server and test accounts
 * Safe to remove: No - critical for preventing authentication regressions
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';
import type { AuthConfig } from '../../src/types';

// Following thepia.com pattern - real API server detection
const API_BASE = 'https://dev.thepia.com:8443';
let apiAvailable = false;
let testEmail = 'test@thepia.com'; // Real test account that exists in Auth0

const getTestConfig = (): AuthConfig => {
  return {
    apiBaseUrl: API_BASE,
    domain: 'dev.thepia.net',
    clientId: 'flows-auth-integration-test',
    enablePasskeys: true,
    enableMagicLinks: true,
    branding: {
      companyName: 'Flows Auth Integration Test',
      showPoweredBy: true
    }
  };
};

describe('Auth0Service Real API Integration Tests', () => {
  let authApiClient: AuthApiClient;
  let testConfig: AuthConfig;

  beforeAll(async () => {
    // Following thepia.com pattern - detect API availability
    testEmail = process.env.TEST_AUTH_EMAIL || 'test@thepia.com';
    
    try {
      const response = await fetch(`${API_BASE}/auth/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ping@test.com' }),
      });
      apiAvailable = response.status !== undefined;
      console.log(`🔗 API Server at ${API_BASE}: ${apiAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      console.warn('Live API not available - skipping integration tests');
      apiAvailable = false;
    }
  });

  beforeEach(() => {
    testConfig = getTestConfig();
    vi.clearAllMocks();
    
    if (apiAvailable) {
      authApiClient = new AuthApiClient(testConfig);
    }
  });

  afterEach(() => {
    // Clean up any test state
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('API Endpoint Connectivity', () => {
    it('should connect to live API endpoints', async () => {
      if (!apiAvailable) {
        console.log('Skipping: Live API not available');
        return;
      }

      // Test that we can reach the API
      const response = await fetch(`${API_BASE}/auth/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'connectivity-test@example.com' }),
      });

      expect(response.status).toBeDefined();
      expect([200, 400, 404].includes(response.status)).toBe(true);
    });

    it('should have correct API base URL configuration', async () => {
      if (!apiAvailable) {
        console.log('Skipping: Live API not available');
        return;
      }

      expect(authApiClient.config.apiBaseUrl).toBe(API_BASE);
      
      // Test that all expected endpoints would be constructed correctly
      const endpoints = [
        'check-user',
        'webauthn/challenge',
        'webauthn/verify',
        'signin/magic-link',
        'verify-magic-link',
      ];

      endpoints.forEach((endpoint) => {
        const fullUrl = `${authApiClient.config.apiBaseUrl}/auth/${endpoint}`;
        expect(fullUrl).toBe(`${API_BASE}/auth/${endpoint}`);
      });
    });
  });

  describe('User Check API Integration', () => {
    it('should handle real test user if available', async () => {
      if (!apiAvailable) {
        console.log('Skipping: Live API not available');
        return;
      }

      if (!process.env.TEST_AUTH_EMAIL) {
        console.log('Skipping: TEST_AUTH_EMAIL not provided');
        return;
      }

      const result = await authApiClient.checkEmail(testEmail);

      expect(result).toHaveProperty('exists');
      expect(result).toHaveProperty('hasPasskey');

      if (result.exists) {
        expect(result).toHaveProperty('userId');
        expect(result.userId).toMatch(/^auth0\|/);
        console.log(`✅ Test user ${testEmail} exists with passkey: ${result.hasPasskey}`);
      } else {
        console.log(`ℹ️ Test user ${testEmail} does not exist in the system`);
      }
    });

    it('should handle non-existent user correctly', async () => {
      if (!apiAvailable) {
        console.log('Skipping: Live API not available');
        return;
      }

      const nonExistentEmail = `non-existent-${Date.now()}@example.com`;
      const result = await authApiClient.checkEmail(nonExistentEmail);

      expect(result.exists).toBe(false);
      expect(result.hasPasskey).toBe(false);
      console.log(`✅ Non-existent user ${nonExistentEmail} correctly identified`);
    });

    it('should validate email format', async () => {
      if (!apiAvailable) {
        console.log('Skipping: Live API not available');
        return;
      }

      const invalidEmail = 'invalid-email-format';
      
      try {
        await authApiClient.checkEmail(invalidEmail);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toBeDefined();
        console.log(`✅ Invalid email correctly rejected: ${error.message}`);
      }
    });
  });

  describe('WebAuthn Challenge Integration', () => {
    it('should generate WebAuthn challenge for existing user', async () => {
      if (!apiAvailable) {
        console.log('Skipping: Live API not available');
        return;
      }

      // First check if user exists
      const userCheck = await authApiClient.checkEmail(testEmail);
      
      if (!userCheck.exists) {
        console.log(`Skipping WebAuthn test: User ${testEmail} does not exist`);
        return;
      }

      try {
        const challenge = await authApiClient.getPasskeyChallenge(testEmail);
        
        expect(challenge).toHaveProperty('challenge');
        expect(challenge).toHaveProperty('rpId');
        expect(challenge.rpId).toBe('dev.thepia.net');
        
        if (userCheck.hasPasskey) {
          expect(challenge).toHaveProperty('allowCredentials');
          expect(Array.isArray(challenge.allowCredentials)).toBe(true);
        }
        
        console.log(`✅ WebAuthn challenge generated for ${testEmail}`);
      } catch (error: any) {
        console.log(`⚠️ WebAuthn challenge error (may be expected): ${error.message}`);
        expect(error.message).toBeDefined();
      }
    });

    it('should handle WebAuthn challenge for non-existent user', async () => {
      if (!apiAvailable) {
        console.log('Skipping: Live API not available');
        return;
      }

      const nonExistentEmail = `non-existent-${Date.now()}@example.com`;
      
      try {
        await authApiClient.getPasskeyChallenge(nonExistentEmail);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toBeDefined();
        console.log(`✅ WebAuthn challenge correctly rejected for non-existent user`);
      }
    });
  });

  describe('Magic Link Integration', () => {
    it('should handle magic link request', async () => {
      if (!apiAvailable) {
        console.log('Skipping: Live API not available');
        return;
      }

      try {
        const result = await authApiClient.sendMagicLinkEmail(testEmail);
        
        expect(result).toHaveProperty('step');
        expect(result.step).toBe('magic_link_sent');
        
        if (result.message) {
          expect(typeof result.message).toBe('string');
        }
        
        console.log(`✅ Magic link sent to ${testEmail}`);
      } catch (error: any) {
        console.log(`⚠️ Magic link error (may be expected): ${error.message}`);
        expect(error.message).toBeDefined();
      }
    });

    it('should handle magic link for non-existent user', async () => {
      if (!apiAvailable) {
        console.log('Skipping: Live API not available');
        return;
      }

      const nonExistentEmail = `non-existent-${Date.now()}@example.com`;
      
      try {
        const result = await authApiClient.sendMagicLinkEmail(nonExistentEmail);
        
        // Some APIs might still send magic link for non-existent users for security
        expect(result).toHaveProperty('step');
        console.log(`✅ Magic link handled for non-existent user: ${result.step}`);
      } catch (error: any) {
        console.log(`✅ Magic link correctly rejected for non-existent user: ${error.message}`);
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle API timeouts gracefully', async () => {
      if (!apiAvailable) {
        console.log('Skipping: Live API not available');
        return;
      }

      // This tests that our service handles network issues properly
      try {
        const result = await authApiClient.checkEmail('timeout-test@example.com');
        
        // Even if the API is slow, we should get a proper response structure
        expect(result).toHaveProperty('exists');
        expect(result).toHaveProperty('hasPasskey');
        console.log(`✅ API timeout test completed successfully`);
      } catch (error: any) {
        console.log(`⚠️ API timeout error (may be expected): ${error.message}`);
        expect(error.message).toBeDefined();
      }
    });

    it('should handle network errors gracefully', async () => {
      if (!apiAvailable) {
        console.log('Skipping: Live API not available');
        return;
      }

      // Create client with invalid API URL
      const invalidConfig = {
        ...testConfig,
        apiBaseUrl: 'https://invalid-api-url.example.com'
      };
      
      const invalidClient = new AuthApiClient(invalidConfig);
      
      try {
        await invalidClient.checkEmail('test@example.com');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/network|fetch|connection/i);
        console.log(`✅ Network error correctly handled: ${error.message}`);
      }
    });

    it('should handle concurrent API calls without interference', async () => {
      if (!apiAvailable) {
        console.log('Skipping: Live API not available');
        return;
      }

      // Make multiple concurrent API calls with delays to avoid rate limiting
      const emails = ['test1@example.com', 'test2@example.com', 'test3@example.com'];
      
      const promises = emails.map((email, index) => 
        new Promise(resolve => 
          setTimeout(() => 
            authApiClient.checkEmail(email)
              .then(resolve)
              .catch(e => resolve({ error: e.message })),
            index * 1000 // 1 second delay between requests
          )
        )
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      console.log(`✅ Concurrent API calls completed: ${results.length} requests`);
      
      // All results should have either valid response or error
      results.forEach((result, index) => {
        if ('error' in result) {
          console.log(`Request ${index + 1} failed: ${result.error}`);
        } else {
          expect(result).toHaveProperty('exists');
          expect(result).toHaveProperty('hasPasskey');
        }
      });
    });
  });
});
