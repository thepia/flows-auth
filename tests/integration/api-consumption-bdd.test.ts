/**
 * BDD Tests: flows-auth API Consumption
 * 
 * Tests that flows-auth correctly consumes API responses from thepia.com server,
 * ensuring perfect alignment between client expectations and server responses.
 * 
 * These tests validate the flows-auth library from a user perspective,
 * using real API calls to ensure actual integration works.
 * 
 * Moved from tests/bdd/ to tests/integration/ for proper organization.
 */

import { describe, it, beforeAll, afterEach, expect, vi } from 'vitest';
import { createAuthStore } from '../../src';
import type { AuthStore } from '../../src/types';

// Test configuration
interface TestConfig {
  apiBaseUrl: string;
  appCode: string; 
  provider: 'workos' | 'auth0';
  domain: string;
}

// Detect which API server to test against
async function detectApiServer(): Promise<string> {
  const servers = ['https://dev.thepia.com:8443', 'https://api.thepia.com'];
  
  for (const server of servers) {
    try {
      const response = await fetch(`${server}/health`, { 
        signal: AbortSignal.timeout(3000) 
      });
      if (response.ok) {
        console.log(`🔗 flows-auth testing against API server: ${server}`);
        return server;
      }
    } catch {
      // Server not available, try next
    }
  }
  
  throw new Error('No API server available for flows-auth testing');
}

describe('BDD: flows-auth API Consumption', () => {
  let apiBaseUrl: string;
  let testConfig: TestConfig;
  
  beforeAll(async () => {
    apiBaseUrl = await detectApiServer();
    testConfig = {
      apiBaseUrl,
      appCode: 'demo', // Primary test organization
      provider: 'workos',
      domain: 'dev.thepia.net'
    };
  });

  describe('Feature: Auth Store Configuration and Initialization', () => {
    it('should create auth store with correct API endpoint detection', async () => {
      // Given: flows-auth is configured for a specific organization
      // When: Creating an auth store
      const authStore = createAuthStore({
        apiBaseUrl: testConfig.apiBaseUrl,
        appCode: testConfig.appCode,
        domain: testConfig.domain,
        enablePasskeys: false, // Disabled for WorkOS testing
        enableMagicPins: true
      });

      // Then: Auth store should be properly initialized
      expect(authStore).toBeDefined();
      expect(typeof authStore.checkUser).toBe('function');
      expect(typeof authStore.sendEmailCode).toBe('function');
      expect(typeof authStore.verifyEmailCode).toBe('function');
      
      // And: Should have correct configuration
      expect(authStore.api).toBeDefined();
    });

    it('should handle API server health check gracefully', async () => {
      // Given: Auth store is configured
      const authStore = createAuthStore({
        apiBaseUrl: testConfig.apiBaseUrl,
        appCode: testConfig.appCode,
        domain: testConfig.domain,
        enablePasskeys: false
      });

      // When: Making any API call (implicitly tests server connectivity)
      // Then: Should not throw connection errors
      await expect(async () => {
        await authStore.checkUser('connectivity-test@example.com');
      }).not.toThrow();
    });
  });

  describe('Feature: User Check Flow Integration', () => {
    let authStore: ReturnType<typeof createAuthStore>;

    beforeAll(() => {
      authStore = createAuthStore({
        apiBaseUrl: testConfig.apiBaseUrl,
        appCode: testConfig.appCode,
        domain: testConfig.domain,
        enablePasskeys: false
      });
    });

    it('should check user existence and return proper flows-auth format', async () => {
      // Given: A test email address  
      const testEmail = `flows-auth-bdd-${Date.now()}@example.com`;

      // When: flows-auth calls checkUser
      const result = await authStore.checkUser(testEmail);

      // Then: Should receive properly formatted response
      expect(result).toMatchObject({
        exists: expect.any(Boolean),
        hasWebAuthn: expect.any(Boolean),
        email: testEmail
      });

      // And: Should handle WorkOS backend specifics
      if (testConfig.provider === 'workos') {
        expect(result.hasWebAuthn).toBe(false); // WorkOS doesn't support passkeys yet
      }

      // And: Should provide user ID if user exists
      if (result.exists) {
        expect(result.userId).toBeTruthy();
        expect(result.userId).toMatch(/^workos\|/); // WorkOS user ID format
        expect(result.emailVerified).toBeDefined();
      }
    });

    it('should handle non-existent user gracefully', async () => {
      // Given: An email that definitely doesn't exist
      const nonExistentEmail = `definitely-not-exists-${Date.now()}@example.com`;

      // When: flows-auth checks non-existent user
      const result = await authStore.checkUser(nonExistentEmail);

      // Then: Should return proper not-found response
      expect(result).toMatchObject({
        exists: false,
        hasWebAuthn: false,
        email: nonExistentEmail
      });

      // And: Should not have user details
      expect(result.userId).toBeUndefined();
    });
  });

  describe('Feature: Email Authentication Flow Integration', () => {
    let authStore: ReturnType<typeof createAuthStore>;
    let testEmail: string;

    beforeAll(() => {
      authStore = createAuthStore({
        apiBaseUrl: testConfig.apiBaseUrl,
        appCode: testConfig.appCode,
        domain: testConfig.domain,
        enablePasskeys: false
      });
    });

    beforeEach(() => {
      testEmail = `flows-auth-email-${Date.now()}@example.com`;
    });

    it('should complete email send flow and return proper response format', async () => {
      // Given: A new user email
      // When: flows-auth sends email code
      const result = await authStore.sendEmailCode(testEmail);

      // Then: Should receive proper flows-auth response format
      expect(result).toMatchObject({
        step: expect.stringMatching(/email-sent|code-required/),
        emailSent: true
      });

      // And: Should handle backend-specific behavior
      if (testConfig.provider === 'workos') {
        // WorkOS creates user during send-email if they don't exist
        const userCheck = await authStore.checkUser(testEmail);
        expect(userCheck.exists).toBe(true);
      }
    });

    it('should handle email code verification attempt with proper error handling', async () => {
      // Given: User has requested an email code
      await authStore.sendEmailCode(testEmail);

      // When: User attempts verification with invalid code
      const verificationPromise = authStore.verifyEmailCode(testEmail, '000000');

      // Then: Should reject with proper error structure
      await expect(verificationPromise).rejects.toThrow();
      
      try {
        await verificationPromise;
      } catch (error: any) {
        // And: Error should have proper structure
        expect(error.message).toMatch(/invalid|expired/i);
      }
    });

    it('should maintain consistent behavior across authentication methods', async () => {
      // Given: flows-auth is configured with specific capabilities
      const authStore = createAuthStore({
        apiBaseUrl: testConfig.apiBaseUrl,
        appCode: testConfig.appCode,
        domain: testConfig.domain,
        enablePasskeys: false, // Explicitly disabled
        enableMagicPins: true
      });

      // When: Checking what auth methods are available
      const userCheck = await authStore.checkUser(testEmail);

      // Then: Should reflect backend capabilities correctly
      expect(userCheck.hasWebAuthn).toBe(false); // No passkeys for WorkOS
      
      // And: Email auth should be available
      await expect(authStore.sendEmailCode(testEmail)).resolves.toBeDefined();
    });
  });

  describe('Feature: Response Structure Consumption', () => {
    let authStore: ReturnType<typeof createAuthStore>;

    beforeAll(() => {
      authStore = createAuthStore({
        apiBaseUrl: testConfig.apiBaseUrl,
        appCode: testConfig.appCode,
        domain: testConfig.domain,
        enablePasskeys: false
      });
    });

    it('should consume API responses and transform to flows-auth format correctly', async () => {
      // Given: flows-auth makes API calls
      const testEmail = 'response-structure-test@example.com';

      // When: Making various API calls
      const checkResult = await authStore.checkUser(testEmail);
      const sendResult = await authStore.sendEmailCode(testEmail);

      // Then: All responses should be in expected flows-auth format
      // checkUser response format
      expect(checkResult).toMatchObject({
        exists: expect.any(Boolean),
        hasWebAuthn: expect.any(Boolean),
        email: testEmail
      });

      // sendEmailCode response format
      expect(sendResult).toMatchObject({
        step: expect.any(String),
        emailSent: expect.any(Boolean)
      });

      // And: Should not expose raw API response structure
      expect(checkResult).not.toHaveProperty('organization');
      expect(checkResult).not.toHaveProperty('success');
      expect(sendResult).not.toHaveProperty('organization'); 
      expect(sendResult).not.toHaveProperty('success');
    });

    it('should handle API error responses and convert to flows-auth errors', async () => {
      // Given: An invalid request that will cause API error
      const invalidEmail = 'not-an-email';

      // When: Making API call that will fail
      const checkPromise = authStore.checkUser(invalidEmail);

      // Then: Should convert API error to flows-auth error format
      await expect(checkPromise).rejects.toThrow();
      
      try {
        await checkPromise;
      } catch (error: any) {
        // And: Error should be user-friendly
        expect(error.message).not.toContain('success: false'); // Raw API response
        expect(error.message).toMatch(/invalid|email/i); // User-friendly message
      }
    });
  });

  describe('Feature: Backend-Specific Behavior Handling', () => {
    let authStore: ReturnType<typeof createAuthStore>;

    beforeAll(() => {
      authStore = createAuthStore({
        apiBaseUrl: testConfig.apiBaseUrl,
        appCode: testConfig.appCode,
        domain: testConfig.domain,
        enablePasskeys: false
      });
    });

    it('should handle WorkOS-specific response format correctly', async () => {
      // Given: flows-auth configured for WorkOS backend
      const testEmail = 'workos-specific-test@example.com';

      // When: Making API calls to WorkOS backend
      const userCheck = await authStore.checkUser(testEmail);

      // Then: Should handle WorkOS user ID format
      if (userCheck.exists && userCheck.userId) {
        expect(userCheck.userId).toMatch(/^workos\|/);
      }

      // And: Should handle WorkOS capabilities correctly
      expect(userCheck.hasWebAuthn).toBe(false); // WorkOS limitation
    });

    it('should adapt to backend provider limitations gracefully', async () => {
      // Given: flows-auth is configured with passkeys disabled (WorkOS)
      const authStore = createAuthStore({
        apiBaseUrl: testConfig.apiBaseUrl,
        appCode: testConfig.appCode,
        domain: testConfig.domain,
        enablePasskeys: false // Matches backend capability
      });

      // When: Checking user capabilities
      const testEmail = 'capability-test@example.com';
      const userCheck = await authStore.checkUser(testEmail);

      // Then: Should reflect actual backend capabilities
      expect(userCheck.hasWebAuthn).toBe(false);
      
      // And: Should still provide email authentication
      await expect(authStore.sendEmailCode(testEmail)).resolves.toBeDefined();
    });
  });

  describe('Feature: Error Recovery and Resilience', () => {
    let authStore: ReturnType<typeof createAuthStore>;

    beforeAll(() => {
      authStore = createAuthStore({
        apiBaseUrl: testConfig.apiBaseUrl,
        appCode: testConfig.appCode,
        domain: testConfig.domain,
        enablePasskeys: false
      });
    });

    it('should handle network timeouts gracefully', async () => {
      // Given: A request that might timeout
      const testEmail = 'timeout-test@example.com';

      // When: Making API call (with reasonable timeout)
      // Then: Should either succeed or fail with proper error
      try {
        const result = await authStore.checkUser(testEmail);
        // If successful, should have proper format
        expect(result).toMatchObject({
          exists: expect.any(Boolean),
          hasWebAuthn: expect.any(Boolean)
        });
      } catch (error: any) {
        // If failed, should have user-friendly error
        expect(error.message).toBeTruthy();
        expect(error.message).not.toContain('undefined');
      }
    });

    it('should handle API server unavailability', async () => {
      // Given: Auth store configured with unreachable server
      const unreachableStore = createAuthStore({
        apiBaseUrl: 'https://definitely-does-not-exist.invalid',
        appCode: testConfig.appCode,
        domain: testConfig.domain,
        enablePasskeys: false
      });

      // When: Making API call to unreachable server
      const checkPromise = unreachableStore.checkUser('test@example.com');

      // Then: Should fail with network error
      await expect(checkPromise).rejects.toThrow();
      
      try {
        await checkPromise;
      } catch (error: any) {
        // And: Error should indicate network issue
        expect(error.message).toMatch(/network|fetch|unreachable/i);
      }
    });
  });

  describe('Feature: Documentation Compliance', () => {
    it('should provide API methods documented in flows-auth docs', async () => {
      // Given: Auth store instance
      const authStore = createAuthStore({
        apiBaseUrl: testConfig.apiBaseUrl,
        appCode: testConfig.appCode,
        domain: testConfig.domain
      });

      // When: Checking available methods
      // Then: Should have all documented API methods
      const requiredMethods = [
        'checkUser',
        'sendEmailCode', 
        'verifyEmailCode',
        'signOut',
        'refreshTokens'
      ];

      for (const method of requiredMethods) {
        expect(authStore).toHaveProperty(method);
        expect(typeof (authStore as any)[method]).toBe('function');
      }
    });

    it('should match response formats documented in API documentation', async () => {
      // Given: Auth store making documented API calls
      const authStore = createAuthStore({
        apiBaseUrl: testConfig.apiBaseUrl,
        appCode: testConfig.appCode,
        domain: testConfig.domain,
        enablePasskeys: false
      });

      const testEmail = 'documentation-compliance@example.com';

      // When: Making calls documented in API docs
      const checkResult = await authStore.checkUser(testEmail);

      // Then: Response should match documented format
      // As per flows-auth documentation, checkUser should return:
      expect(checkResult).toMatchObject({
        exists: expect.any(Boolean),
        hasWebAuthn: expect.any(Boolean),
        email: testEmail,
        // userId is optional and only present when exists: true
        ...(checkResult.exists ? { userId: expect.any(String) } : {})
      });
    });
  });
});
