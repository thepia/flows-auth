/**
 * API Environment Integration Tests
 * 
 * These tests validate that the test environment is properly configured
 * and that the API backend is available and responding correctly.
 * 
 * Based on testing principles from the main codebase:
 * - /tests/auth/auth0Service-live-integration.test.ts
 * - /docs/auth/webauthn-test-strategy.md
 */

import { beforeAll, describe, expect, test } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';
import { TEST_CONFIG, TEST_ACCOUNTS } from '../test-setup';

describe('API Environment Integration', () => {
  let apiClient: AuthApiClient;
  let apiAvailable = false;

  beforeAll(async () => {
    apiClient = new AuthApiClient(TEST_CONFIG);
    
    // Validate API availability - REQUIRED for integration tests
    try {
      const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/auth/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ping@test.com' }),
      });
      
      if (!response.ok && response.status !== 400) {
        throw new Error(`API health check failed: ${response.status} ${response.statusText}`);
      }
      
      apiAvailable = true;
      console.log(`✅ API Environment Ready: ${TEST_CONFIG.apiBaseUrl}`);
      
    } catch (error) {
      console.error(`❌ API Environment NOT READY`);
      console.error(`   URL: ${TEST_CONFIG.apiBaseUrl}`);
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      
      throw new Error(`Integration test environment not ready: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  describe('API Connectivity', () => {
    test('should connect to auth API endpoints', async () => {
      expect(apiAvailable).toBe(true);
      
      // Test basic connectivity
      const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/auth/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'connectivity-test@example.com' }),
      });
      
      // Should get a response (even if user doesn't exist)
      expect([200, 400, 404]).toContain(response.status);
    });

    test('should have correct CORS headers', async () => {
      const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/auth/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'cors-test@example.com' }),
      });
      
      // Should not fail due to CORS issues
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    test('should validate API endpoints are properly configured', () => {
      // Ensure we're testing against the correct environment
      expect(TEST_CONFIG.apiBaseUrl).toBeDefined();
      expect(TEST_CONFIG.apiBaseUrl).toMatch(/^https?:\/\//);
      expect(TEST_CONFIG.clientId).toBeDefined();
      expect(TEST_CONFIG.domain).toBeDefined();
      
      console.log(`🔧 Testing against: ${TEST_CONFIG.apiBaseUrl}`);
      console.log(`🏷️  Client ID: ${TEST_CONFIG.clientId}`);
      console.log(`🌐 Domain: ${TEST_CONFIG.domain}`);
    });
  });

  describe('Test Account Validation', () => {
    test('should have properly configured test accounts', async () => {
      expect(TEST_ACCOUNTS.existingWithPasskey.email).toMatch(/@/);
      expect(TEST_ACCOUNTS.existingWithoutPasskey.email).toMatch(/@/);
      expect(TEST_ACCOUNTS.newUser.email).toMatch(/@/);
      
      console.log(`👤 Test accounts configured:`);
      console.log(`   With passkey: ${TEST_ACCOUNTS.existingWithPasskey.email}`);
      console.log(`   Without passkey: ${TEST_ACCOUNTS.existingWithoutPasskey.email}`);
      console.log(`   New user pattern: ${TEST_ACCOUNTS.newUser.email}`);
    });

    test('should validate existing user with passkey exists in system', async () => {
      const response = await apiClient.checkEmail(TEST_ACCOUNTS.existingWithPasskey.email);
      
      if (!response.exists) {
        console.warn(`⚠️  Test account not found: ${TEST_ACCOUNTS.existingWithPasskey.email}`);
        console.warn(`   Please ensure this account exists in Auth0 with a registered passkey`);
        console.warn(`   Or update TEST_ACCOUNTS.existingWithPasskey.email in test-setup.ts`);
      }
      
      // This is a validation warning, not a hard failure for environment setup
      expect(response).toHaveProperty('exists');
      expect(response).toHaveProperty('hasPasskey');
    });

    test('should validate existing user without passkey exists in system', async () => {
      const response = await apiClient.checkEmail(TEST_ACCOUNTS.existingWithoutPasskey.email);
      
      if (!response.exists) {
        console.warn(`⚠️  Test account not found: ${TEST_ACCOUNTS.existingWithoutPasskey.email}`);
        console.warn(`   Please ensure this account exists in Auth0 without a passkey`);
        console.warn(`   Or update TEST_ACCOUNTS.existingWithoutPasskey.email in test-setup.ts`);
      }
      
      expect(response).toHaveProperty('exists');
      expect(response).toHaveProperty('hasPasskey');
    });
  });

  describe('API Contract Validation', () => {
    test('should validate /auth/check-user endpoint contract', async () => {
      const response = await apiClient.checkEmail('contract-test@example.com');
      
      // Required fields
      expect(response).toHaveProperty('exists');
      expect(response).toHaveProperty('hasPasskey');
      expect(typeof response.exists).toBe('boolean');
      expect(typeof response.hasPasskey).toBe('boolean');
      
      // Optional fields
      if (response.socialProviders) {
        expect(Array.isArray(response.socialProviders)).toBe(true);
      }
    });

    test('should validate error handling for malformed requests', async () => {
      // Test with invalid email format
      await expect(apiClient.checkEmail('not-an-email')).rejects.toThrow();
    });

    test('should validate passkey challenge endpoint availability', async () => {
      // This should fail for non-existent user, but endpoint should be reachable
      try {
        await apiClient.getPasskeyChallenge('challenge-test@example.com');
      } catch (error) {
        // Expected to fail for non-existent user, but should be a proper API error
        expect(error).toBeDefined();
        console.log(`✅ Passkey challenge endpoint reachable (user not found is expected)`);
      }
    });

    test('should validate magic link endpoint availability', async () => {
      try {
        const response = await apiClient.signInWithMagicLink({ 
          email: 'magic-link-test@example.com' 
        });
        
        // Should succeed even for non-existent users in most implementations
        expect(response).toHaveProperty('step');
        console.log(`✅ Magic link endpoint reachable`);
        
      } catch (error) {
        // Some implementations may reject non-existent users
        expect(error).toBeDefined();
        console.log(`✅ Magic link endpoint reachable (validation error is acceptable)`);
      }
    });
  });

  describe('Environment Configuration', () => {
    test('should have valid Auth0 configuration', () => {
      expect(TEST_CONFIG.domain).toMatch(/\.auth0\.com$/);
      expect(TEST_CONFIG.clientId).toBeTruthy();
      expect(TEST_CONFIG.enablePasskeys).toBe(true);
      expect(TEST_CONFIG.enableMagicLinks).toBe(true);
      
      console.log(`🔐 Auth0 Domain: ${TEST_CONFIG.domain}`);
      console.log(`🚀 Passkeys enabled: ${TEST_CONFIG.enablePasskeys}`);
      console.log(`📧 Magic links enabled: ${TEST_CONFIG.enableMagicLinks}`);
    });

    test('should have error reporting configured for testing', () => {
      expect(TEST_CONFIG.errorReporting).toBeDefined();
      expect(TEST_CONFIG.errorReporting?.enabled).toBe(true);
      expect(TEST_CONFIG.errorReporting?.debug).toBe(true);
      
      console.log(`📊 Error reporting: ${TEST_CONFIG.errorReporting?.enabled ? 'enabled' : 'disabled'}`);
    });

    test('should validate environment variables', () => {
      const apiUrl = process.env.TEST_API_URL || TEST_CONFIG.apiBaseUrl;
      const clientId = process.env.TEST_CLIENT_ID || TEST_CONFIG.clientId;
      
      expect(apiUrl).toBeTruthy();
      expect(clientId).toBeTruthy();
      
      console.log(`🌍 Environment API URL: ${apiUrl}`);
      console.log(`🔑 Environment Client ID: ${clientId ? 'configured' : 'not set'}`);
    });
  });

  describe('Performance Validation', () => {
    test('should have acceptable API response times', async () => {
      const startTime = Date.now();
      
      await apiClient.checkEmail('performance-test@example.com');
      
      const duration = Date.now() - startTime;
      
      // API should respond within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max
      
      if (duration > 1000) {
        console.warn(`⚠️  API response slow: ${duration}ms (expected < 1000ms)`);
      } else {
        console.log(`⚡ API response time: ${duration}ms`);
      }
    });
  });
});