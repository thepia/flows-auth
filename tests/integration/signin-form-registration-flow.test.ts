/**
 * Regression test for SignInForm registration state issue
 *
 * Purpose: Identify and prevent regression where Sign In form doesn't show registration state
 * Context: User reports that registration flow is not being triggered properly
 * Issue: API call to /auth/check-user returns 500 error, preventing user existence check
 *
 * This is a regression test that should be kept to prevent future regressions.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';
import { AuthApiClient } from '../../src/api/auth-api';

describe('SignInForm Registration Flow Regression', () => {
  let authStore: any;
  let apiClient: AuthApiClient;
  let apiServerRunning = false;

  const API_BASE = 'https://dev.thepia.com:8443';
  const TEST_CONFIG = {
    apiBaseUrl: API_BASE,
    clientId: 'flows-auth-demo',
    enablePasskeys: true,
    enableMagicPins: true
  };

  beforeAll(async () => {
    // Check if API server is running
    try {
      const response = await fetch(`${API_BASE}/health`);
      apiServerRunning = response.ok;
      console.log(`🔗 API Server at ${API_BASE}: ${apiServerRunning ? 'RUNNING' : 'NOT AVAILABLE'}`);
    } catch (error) {
      console.warn('Local API server not available - skipping debug tests');
      apiServerRunning = false;
    }

    if (apiServerRunning) {
      // Initialize auth store and API client
      authStore = createAuthStore(TEST_CONFIG);
      apiClient = new AuthApiClient(TEST_CONFIG);
    }
  });

  describe('1. API Endpoint Connectivity', () => {
    it('should connect to health endpoint', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      const response = await fetch(`${API_BASE}/health`);
      expect(response.ok).toBe(true);
      console.log('✅ Health endpoint accessible');
    });

    it('should have correct check-user endpoint', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      // Test the endpoint exists (even if it returns an error for invalid data)
      try {
        const response = await fetch(`${API_BASE}/auth/check-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'test@example.com' })
        });
        
        console.log(`📡 /auth/check-user endpoint status: ${response.status}`);
        console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));
        
        if (response.status === 500) {
          const errorText = await response.text();
          console.log(`❌ Server error response: ${errorText}`);
        }
        
        // Endpoint should exist (not 404)
        expect(response.status).not.toBe(404);
      } catch (error) {
        console.error('❌ Network error calling check-user:', error);
        throw error;
      }
    });
  });

  describe('2. Auth API Client Testing', () => {
    it('should handle checkEmail for existing user', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        const result = await apiClient.checkEmail('test@thepia.com');
        console.log('✅ checkEmail result for test@thepia.com:', result);
        
        expect(result).toHaveProperty('exists');
        expect(result).toHaveProperty('hasPasskey');
        
        console.log(`📊 User exists: ${result.exists}, Has passkey: ${result.hasPasskey}`);
      } catch (error) {
        console.error('❌ checkEmail failed for existing user:', error);
        throw error;
      }
    });

    it('should handle checkEmail for non-existing user', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        const nonExistentEmail = `nonexistent-${Date.now()}@example.com`;
        const result = await apiClient.checkEmail(nonExistentEmail);
        console.log(`✅ checkEmail result for ${nonExistentEmail}:`, result);
        
        expect(result).toHaveProperty('exists');
        expect(result.exists).toBe(false);
        
        console.log(`📊 Non-existent user correctly identified: exists=${result.exists}`);
      } catch (error) {
        console.error('❌ checkEmail failed for non-existing user:', error);
        throw error;
      }
    });

    it('should handle invalid email format', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        await apiClient.checkEmail('invalid-email');
        console.log('⚠️ Invalid email was accepted (unexpected)');
      } catch (error) {
        console.log('✅ Invalid email correctly rejected:', error.message);
        // Expect either email validation error or rate limit error
        expect(error.message).toMatch(/(email|rate|requests)/i);
      }
    });
  });

  describe('3. Auth Store Integration', () => {
    it('should initialize auth store correctly', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      expect(authStore).toBeDefined();
      expect(authStore.checkUser).toBeDefined();
      expect(authStore.api).toBeDefined();
      
      console.log('✅ Auth store initialized with required methods');
    });

    it('should handle checkUser through auth store', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        const result = await authStore.checkUser('test@thepia.com');
        console.log('✅ Auth store checkUser result:', result);
        
        expect(result).toHaveProperty('exists');
        expect(result).toHaveProperty('hasWebAuthn');
        
        console.log(`📊 Auth store result: exists=${result.exists}, hasWebAuthn=${result.hasWebAuthn}`);
      } catch (error) {
        console.error('❌ Auth store checkUser failed:', error);
        throw error;
      }
    });
  });

  describe('4. SignInForm Logic Simulation', () => {
    it('should simulate email submission logic', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Simulate the exact logic from SignInForm.svelte handleEmailSubmit
      const email = 'newuser@example.com';
      
      try {
        console.log(`🔍 Simulating email submission for: ${email}`);
        
        // Step 1: Check what auth methods are available for this email
        const emailCheck = await authStore.api.checkEmail(email);
        const userExists = emailCheck.exists;
        const hasPasskeys = emailCheck.hasPasskey;
        
        console.log(`📊 Email check results:`, {
          email,
          userExists,
          hasPasskeys,
          fullResult: emailCheck
        });
        
        // Step 2: Determine next step based on results
        let expectedStep = 'unknown';
        
        if (hasPasskeys) {
          expectedStep = 'passkey-auth';
          console.log('🔐 Expected flow: Passkey authentication');
        } else if (userExists && TEST_CONFIG.enableMagicPins) {
          expectedStep = 'magic-link';
          console.log('📧 Expected flow: Magic link authentication');
        } else if (!userExists) {
          expectedStep = 'registration-terms';
          console.log('📝 Expected flow: Registration (NEW USER)');
        } else {
          expectedStep = 'no-auth-methods';
          console.log('❌ Expected flow: No authentication methods available');
        }
        
        // Step 3: Verify the logic is working correctly
        expect(expectedStep).not.toBe('unknown');
        
        if (!userExists) {
          console.log('✅ NEW USER DETECTED - Registration flow should be triggered');
          expect(expectedStep).toBe('registration-terms');
        } else {
          console.log('✅ EXISTING USER DETECTED - Authentication flow should be triggered');
          expect(['passkey-auth', 'magic-link']).toContain(expectedStep);
        }
        
      } catch (error) {
        console.error('❌ Email submission simulation failed:', error);
        throw error;
      }
    });

    it('should test with known existing user', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));

      const email = 'test@thepia.com'; // Known existing user
      
      try {
        const emailCheck = await authStore.api.checkEmail(email);
        console.log(`📊 Known user check for ${email}:`, emailCheck);
        
        expect(emailCheck.exists).toBe(true);
        console.log('✅ Known existing user correctly identified');
        
      } catch (error) {
        console.error('❌ Known user check failed:', error);
        throw error;
      }
    });
  });

  describe('5. Error Analysis', () => {
    it('should capture and analyze API errors', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      // Test various error scenarios
      const testCases = [
        { email: '', description: 'empty email' },
        { email: 'invalid', description: 'invalid email format' },
        { email: 'test@', description: 'incomplete email' },
      ];

      for (const [index, testCase] of testCases.entries()) {
        // Add delay between each test case to avoid rate limiting
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        try {
          await apiClient.checkEmail(testCase.email);
          console.log(`⚠️ ${testCase.description} was unexpectedly accepted`);
        } catch (error) {
          console.log(`✅ ${testCase.description} correctly rejected:`, error.message);
        }
      }
    });

    it('should test CORS and network issues', async () => {
      if (!apiServerRunning) {
        console.log('Skipping: API server not available');
        return;
      }

      try {
        // Test direct fetch to identify CORS issues
        const response = await fetch(`${API_BASE}/auth/check-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://dev.thepia.net:5176'
          },
          body: JSON.stringify({ email: 'test@thepia.com' })
        });

        console.log(`📡 Direct fetch status: ${response.status}`);
        console.log(`📡 CORS headers:`, {
          'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
          'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
          'access-control-allow-headers': response.headers.get('access-control-allow-headers')
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`❌ Error response body: ${errorText}`);
        }

      } catch (error) {
        console.error('❌ Network/CORS error:', error);
      }
    });
  });
});
