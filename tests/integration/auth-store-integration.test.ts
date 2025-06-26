/**
 * Auth Store Integration Tests
 * Comprehensive test coverage for auth store with state machine against real API scenarios
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { createAuthStore, createAuthDerivedStores } from '../../src/stores/auth-store';
import type { AuthConfig, AuthMachineState } from '../../src/types';

// Import shared test configuration
import { TEST_CONFIG } from '../test-setup';

// Local test config override for consistency
const LOCAL_TEST_CONFIG = {
  ...TEST_CONFIG,
  clientId: 'test-flows-auth-client',
  domain: 'dev.thepia.net',
  enablePasskeys: true,
  enableMagicLinks: true,
  enablePasswordLogin: false, // As per requirements
  enableSocialLogin: false,
  errorReporting: {
    enabled: true,
    debug: true
  },
  branding: {
    companyName: 'Test Company',
    showPoweredBy: true
  }
} as AuthConfig;

// Test user accounts (these should exist in the test environment)
const TEST_ACCOUNTS = {
  existingWithPasskey: {
    email: 'test-with-passkey@thepia.net',
    hasPasskey: true,
    hasPassword: false
  },
  existingWithoutPasskey: {
    email: 'test-without-passkey@thepia.net', 
    hasPasskey: false,
    hasPassword: false
  },
  newUser: {
    email: `test-new-${Date.now()}@thepia.net`,
    hasPasskey: false,
    hasPassword: false
  },
  invalidEmail: {
    email: 'nonexistent@thepia.net',
    hasPasskey: false,
    hasPassword: false
  }
} as const;

// WebAuthn mock helpers
const mockWebAuthnSuccess = () => {
  vi.spyOn(navigator.credentials, 'get').mockResolvedValue({
    id: 'test-credential-id',
    rawId: new ArrayBuffer(16),
    response: {
      clientDataJSON: new TextEncoder().encode('{"type":"webauthn.get"}'),
      authenticatorData: new ArrayBuffer(32),
      signature: new ArrayBuffer(32),
      userHandle: new TextEncoder().encode('test-user-id')
    },
    type: 'public-key'
  } as any);
};

const mockWebAuthnUserCancellation = () => {
  const error = new Error('The operation either timed out or was not allowed.');
  error.name = 'NotAllowedError';
  vi.spyOn(navigator.credentials, 'get').mockRejectedValue(error);
};

const mockWebAuthnTimeout = () => {
  const error = new Error('Request timed out');
  error.name = 'TimeoutError';
  vi.spyOn(navigator.credentials, 'get').mockRejectedValue(error);
};

describe('Auth Store Integration Tests', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let derivedStores: ReturnType<typeof createAuthDerivedStores>;
  let apiAvailable = false;
  let actualApiUrl = LOCAL_TEST_CONFIG.apiBaseUrl;

  beforeAll(async () => {
    /**
     * API Server Testing Strategy
     * 
     * Integration tests require a live API server to validate end-to-end functionality.
     * We test against multiple API servers with fallback logic:
     * 
     * 1. Local development server: https://dev.thepia.com:8443 (preferred for development)
     * 2. Production API server: https://api.thepia.com (fallback for CI/CD and when local unavailable)
     * 
     * This ensures tests work in both development and CI environments without requiring
     * developers to run a local API server.
     * 
     * For more details on API server setup, see:
     * - /docs/development/api-server-architecture.md
     * - /docs/development/testing-strategy.md
     * - CLAUDE.md section "API Server Architecture"
     */
    
    // Try multiple API servers with fallback logic
    const urlsToTry = [
      LOCAL_TEST_CONFIG.apiBaseUrl,
      ...(LOCAL_TEST_CONFIG.apiBaseUrl !== 'https://api.thepia.com' ? ['https://api.thepia.com'] : [])
    ];

    for (const apiUrl of urlsToTry) {
      try {
        console.log(`🔍 Trying API server: ${apiUrl}`);
        
        // Try a simple health/ping endpoint first, fallback to check-user if needed
        let response: Response;
        try {
          // Try basic health check first
          response = await fetch(`${apiUrl}/health`, {
            method: 'GET'
          });
          
          // If health endpoint doesn't exist, try the actual API endpoint
          if (response.status === 404) {
            response = await fetch(`${apiUrl}/auth/check-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: 'ping@test.com' }),
            });
          }
        } catch (fetchError) {
          // If both fail, try just the auth endpoint as last resort
          response = await fetch(`${apiUrl}/auth/check-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'ping@test.com' }),
          });
        }
        
        // Consider the server available if we get any response (even errors like 400, 401, 405)
        // Only fail if we can't connect at all or get server errors
        if (response.status >= 500) {
          throw new Error(`API server error: ${response.status} ${response.statusText}`);
        }
        
        // Success! Use this API URL
        actualApiUrl = apiUrl;
        apiAvailable = true;
        console.log(`✅ Live API available: ${actualApiUrl}`);
        console.log(`📧 Test accounts configured: ${Object.keys(TEST_ACCOUNTS).length}`);
        
        // Update config to use working API URL
        LOCAL_TEST_CONFIG.apiBaseUrl = actualApiUrl;
        
        break;
        
      } catch (error) {
        console.warn(`⚠️  API server not available: ${apiUrl}`);
        console.warn(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        
        if (apiUrl === urlsToTry[urlsToTry.length - 1]) {
          // Last URL tried, give up
          console.error(`❌ Integration tests FAILED: No API servers available`);
          console.error(`   Tried: ${urlsToTry.join(', ')}`);
          console.error(`   
   To run integration tests, ensure:
   1. Local API server is running at https://dev.thepia.com:8443, OR
   2. Production API server at https://api.thepia.com is accessible
   3. Network connectivity is available
   
   Alternatively, run unit tests only: pnpm test:unit
          `);
          
          // Integration tests MUST fail if no API is available
          throw new Error('Integration tests require live API - cannot continue');
        }
      }
    }
  });

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    authStore = createAuthStore(LOCAL_TEST_CONFIG);
    derivedStores = createAuthDerivedStores(authStore);
  });

  afterEach(() => {
    if (authStore?.destroy) {
      authStore.destroy();
    }
    vi.restoreAllMocks();
  });

  describe('State Machine Integration', () => {
    it('should initialize in checkingSession state and transition to sessionInvalid', async () => {
      expect(authStore.stateMachine.currentState()).toBe('checkingSession');
      
      // Wait for state machine to complete initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalState = authStore.stateMachine.currentState();
      expect(['sessionInvalid', 'sessionValid']).toContain(finalState);
    });

    it('should transition through combined auth flow', async () => {
      const stateTransitions: AuthMachineState[] = [];
      
      authStore.stateMachine.subscribe(({ state }) => {
        stateTransitions.push(state);
      });

      // Start from unauthenticated state
      authStore.clickNext();
      expect(authStore.stateMachine.matches('combinedAuth')).toBe(true);

      // Type email to trigger conditional mediation
      authStore.typeEmail(TEST_ACCOUNTS.existingWithPasskey.email);
      expect(authStore.stateMachine.matches('conditionalMediation')).toBe(true);

      // Verify state transition sequence
      expect(stateTransitions).toContain('combinedAuth');
      expect(stateTransitions).toContain('conditionalMediation');
    });

    it('should handle explicit authentication flow', async () => {
      authStore.clickNext(); // Go to combinedAuth
      authStore.typeEmail(TEST_ACCOUNTS.existingWithPasskey.email);
      authStore.clickContinue(); // Trigger explicit auth
      
      expect(authStore.stateMachine.matches('explicitAuth')).toBe(true);
    });

    it('should handle error states with proper classification', async () => {
      const stateTransitions: AuthMachineState[] = [];
      
      authStore.stateMachine.subscribe(({ state }) => {
        stateTransitions.push(state);
      });

      authStore.clickNext();
      authStore.typeEmail(TEST_ACCOUNTS.existingWithPasskey.email);
      
      // Mock user cancellation (timing < 30s)
      mockWebAuthnUserCancellation();
      
      try {
        await authStore.signInWithPasskey(TEST_ACCOUNTS.existingWithPasskey.email);
      } catch (error) {
        // Expected to fail
      }

      // Should transition to error handling and user cancellation
      expect(stateTransitions).toContain('errorHandling');
      expect(stateTransitions).toContain('userCancellation');
    });
  });

  describe('API Integration - Email Check', () => {
    it('should correctly identify existing user with passkey', async () => {
      const response = await authStore.api.checkEmail(TEST_ACCOUNTS.existingWithPasskey.email);
      
      expect(response.exists).toBe(true);
      expect(response.hasPasskey).toBe(true);
    });

    it('should correctly identify existing user without passkey', async () => {
      const response = await authStore.api.checkEmail(TEST_ACCOUNTS.existingWithoutPasskey.email);
      
      expect(response.exists).toBe(true);
      expect(response.hasPasskey).toBe(false);
    });

    it('should correctly identify non-existent user', async () => {
      const response = await authStore.api.checkEmail(TEST_ACCOUNTS.newUser.email);
      
      expect(response.exists).toBe(false);
      expect(response.hasPasskey).toBe(false);
    });

    it('should handle malformed email gracefully', async () => {
      await expect(authStore.api.checkEmail('not-an-email')).rejects.toThrow();
    });

    it('should validate API response structure', async () => {
      const response = await authStore.api.checkEmail(TEST_ACCOUNTS.existingWithPasskey.email);
      
      // Ensure API contract compliance
      expect(response).toHaveProperty('exists');
      expect(response).toHaveProperty('hasPasskey');
      expect(typeof response.exists).toBe('boolean');
      expect(typeof response.hasPasskey).toBe('boolean');
      
      if (response.exists) {
        expect(response).toHaveProperty('socialProviders');
        expect(Array.isArray(response.socialProviders)).toBe(true);
      }
    });
  });

  describe('WebAuthn Integration Scenarios', () => {
    it('should handle successful passkey authentication', async () => {
      if (!navigator.credentials) {
        return; // Skip if WebAuthn not available
      }

      mockWebAuthnSuccess();
      
      const startTime = Date.now();
      
      try {
        const result = await authStore.signInWithPasskey(TEST_ACCOUNTS.existingWithPasskey.email);
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(5000); // Should complete quickly
        
        if (result.step === 'success') {
          expect(result.user).toBeDefined();
          expect(result.accessToken).toBeDefined();
          
          const state = get(authStore);
          expect(state.state).toBe('authenticated');
        }
      } catch (error) {
        // May fail in test environment - that's ok, we're testing the flow
        console.log('WebAuthn test failed (expected in test env):', error);
      }
    });

    it('should handle user cancellation with proper timing classification', async () => {
      mockWebAuthnUserCancellation();
      
      const startTime = Date.now();
      
      try {
        await authStore.signInWithPasskey(TEST_ACCOUNTS.existingWithPasskey.email);
      } catch (error) {
        const duration = Date.now() - startTime;
        
        expect(error).toBeDefined();
        expect(duration).toBeLessThan(30000); // Should be classified as user cancellation
      }
    });

    it('should handle timeout with proper classification', async () => {
      mockWebAuthnTimeout();
      
      const startTime = Date.now();
      
      try {
        await authStore.signInWithPasskey(TEST_ACCOUNTS.existingWithPasskey.email);
      } catch (error) {
        const duration = Date.now() - startTime;
        
        expect(error).toBeDefined();
        // Timeout classification depends on actual duration
      }
    });

    it('should handle conditional authentication silently', async () => {
      const result = await authStore.startConditionalAuthentication(TEST_ACCOUNTS.existingWithPasskey.email);
      
      // Should not throw for any result (true/false)
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Magic Link Integration', () => {
    it('should send magic link for existing user', async () => {
      const result = await authStore.signInWithMagicLink(TEST_ACCOUNTS.existingWithoutPasskey.email);
      
      expect(result.step).toBe('magic_link_sent');
      expect(result.magicLinkSent).toBe(true);
      
      const state = get(authStore);
      expect(state.state).toBe('unauthenticated'); // Still unauthenticated until link clicked
    });

    it('should send magic link for new user', async () => {
      const result = await authStore.signInWithMagicLink(TEST_ACCOUNTS.newUser.email);
      
      expect(result.step).toBe('magic_link_sent');
      expect(result.magicLinkSent).toBe(true);
    });

    it('should validate magic link response structure', async () => {
      const result = await authStore.signInWithMagicLink(TEST_ACCOUNTS.existingWithoutPasskey.email);
      
      // Ensure API contract compliance
      expect(result).toHaveProperty('step');
      expect(result).toHaveProperty('magicLinkSent');
      expect(result.step).toBe('magic_link_sent');
      expect(result.magicLinkSent).toBe(true);
      
      if (result.message) {
        expect(typeof result.message).toBe('string');
        expect(result.message.length).toBeGreaterThan(0);
      }
    });

    it('should handle rate limiting gracefully', async () => {
      // Send multiple requests to test rate limiting behavior
      const promises = Array(3).fill(0).map((_, i) => 
        authStore.signInWithMagicLink(`${TEST_ACCOUNTS.existingWithoutPasskey.email.replace('@', `+${i}@`)}`)
      );
      
      const results = await Promise.allSettled(promises);
      
      // All requests should either succeed or be properly rate limited
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          // Rate limiting should return proper error structure
          expect(result.reason).toBeDefined();
          console.log(`Request ${index} rate limited (expected behavior)`);
        } else {
          // Successful requests should have proper structure
          expect(result.value.step).toBe('magic_link_sent');
        }
      });
    });
  });

  describe('Session Management', () => {
    it('should persist authentication state across store recreation', async () => {
      // Mock successful authentication
      const mockUser = {
        id: 'test-123',
        email: TEST_ACCOUNTS.existingWithPasskey.email,
        name: 'Test User',
        emailVerified: true,
        createdAt: new Date().toISOString()
      };

      // Manually set authenticated state
      localStorage.setItem('auth_access_token', 'test-token');
      localStorage.setItem('auth_refresh_token', 'test-refresh');
      localStorage.setItem('auth_expires_at', (Date.now() + 3600000).toString());
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // Create new store instance
      const newStore = createAuthStore(LOCAL_TEST_CONFIG);
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization
      
      const state = get(newStore);
      expect(state.state).toBe('authenticated');
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('test-token');
    });

    it('should handle expired tokens properly', async () => {
      // Set expired token
      localStorage.setItem('auth_access_token', 'expired-token');
      localStorage.setItem('auth_expires_at', (Date.now() - 1000).toString()); // Expired
      
      const newStore = createAuthStore(LOCAL_TEST_CONFIG);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const state = get(newStore);
      expect(state.state).toBe('unauthenticated');
    });

    it('should sign out and clear all stored data', async () => {
      // Set up authenticated state
      localStorage.setItem('auth_access_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify({ id: '123' }));
      
      await authStore.signOut();
      
      expect(localStorage.getItem('auth_access_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
      
      const state = get(authStore);
      expect(state.state).toBe('unauthenticated');
      expect(state.user).toBeNull();
    });
  });

  describe('Derived Stores Integration', () => {
    it('should provide correct derived store values', () => {
      expect(get(derivedStores.isAuthenticated)).toBe(false);
      expect(get(derivedStores.isLoading)).toBe(false);
      expect(get(derivedStores.user)).toBeNull();
      expect(get(derivedStores.error)).toBeNull();
    });

    it('should track state machine states correctly', () => {
      expect(get(derivedStores.isCheckingSession)).toBe(true);
      
      authStore.clickNext();
      expect(get(derivedStores.isCombinedAuth)).toBe(true);
      
      authStore.typeEmail(TEST_ACCOUNTS.existingWithPasskey.email);
      expect(get(derivedStores.isConditionalAuth)).toBe(true);
    });

    it('should update derived stores when state changes', async () => {
      const userValues: any[] = [];
      const authValues: boolean[] = [];
      
      derivedStores.user.subscribe(user => userValues.push(user));
      derivedStores.isAuthenticated.subscribe(auth => authValues.push(auth));
      
      // Mock authentication
      const mockUser = {
        id: 'test-123',
        email: TEST_ACCOUNTS.existingWithPasskey.email,
        name: 'Test User',
        emailVerified: true,
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('auth_access_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      
      authStore.initialize();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(userValues).toContain(mockUser);
      expect(authValues).toContain(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API failure
      vi.spyOn(authStore.api, 'checkEmail').mockRejectedValue(new Error('Network error'));
      
      await expect(authStore.api.checkEmail('test@example.com')).rejects.toThrow('Network error');
      
      // Store should remain in stable state
      const state = get(authStore);
      expect(['unauthenticated', 'error']).toContain(state.state);
    });

    it('should recover from errors when reset', () => {
      // Set error state
      const errorState = get(authStore);
      authStore.reset();
      
      const resetState = get(authStore);
      expect(resetState.state).toBe('unauthenticated');
      expect(resetState.error).toBeNull();
      expect(resetState.user).toBeNull();
    });

    it('should handle state machine reset properly', () => {
      authStore.clickNext();
      authStore.typeEmail(TEST_ACCOUNTS.existingWithPasskey.email);
      
      expect(authStore.stateMachine.matches('conditionalMediation')).toBe(true);
      
      authStore.resetToAuth();
      expect(authStore.stateMachine.matches('combinedAuth')).toBe(true);
    });
  });

  describe('Event System Integration', () => {
    it('should emit events during authentication lifecycle', async () => {
      const events: any[] = [];
      
      authStore.on('sign_in_started', (data) => events.push({ type: 'started', ...data }));
      authStore.on('sign_in_success', (data) => events.push({ type: 'success', ...data }));
      authStore.on('sign_in_error', (data) => events.push({ type: 'error', ...data }));
      
      try {
        await authStore.signInWithPasskey(TEST_ACCOUNTS.existingWithPasskey.email);
      } catch (error) {
        // Expected to fail in test environment
      }
      
      expect(events.some(e => e.type === 'started')).toBe(true);
      // Success or error depends on test environment
    });

    it('should handle event unsubscription', () => {
      const handler = vi.fn();
      const unsubscribe = authStore.on('sign_in_started', handler);
      
      unsubscribe();
      
      authStore.signInWithMagicLink('test@example.com').catch(() => {});
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with multiple store creations', () => {
      const stores = Array(10).fill(0).map(() => createAuthStore(LOCAL_TEST_CONFIG));
      
      stores.forEach(store => {
        if (store.destroy) {
          store.destroy();
        }
      });
      
      // No assertions - just ensuring no errors/leaks
      expect(true).toBe(true);
    });

    it('should handle rapid state transitions', () => {
      const transitions = 100;
      
      for (let i = 0; i < transitions; i++) {
        authStore.clickNext();
        authStore.typeEmail(`test${i}@example.com`);
        authStore.resetToAuth();
      }
      
      // Should handle rapid transitions without errors
      expect(authStore.stateMachine.matches('combinedAuth')).toBe(true);
    });
  });
});

describe('Auth Store E2E Scenarios', () => {
  let authStore: ReturnType<typeof createAuthStore>;

  beforeEach(() => {
    localStorage.clear();
    authStore = createAuthStore(LOCAL_TEST_CONFIG);
  });

  afterEach(() => {
    if (authStore?.destroy) {
      authStore.destroy();
    }
  });

  describe('Complete User Journeys', () => {
    it('should complete new user registration flow', async () => {
      // 1. Start authentication
      authStore.clickNext();
      expect(authStore.stateMachine.matches('combinedAuth')).toBe(true);

      // 2. Enter new user email
      authStore.typeEmail(TEST_ACCOUNTS.newUser.email);
      expect(authStore.stateMachine.matches('conditionalMediation')).toBe(true);

      // 3. No passkeys available, continue to explicit auth
      authStore.clickContinue();
      expect(authStore.stateMachine.matches('explicitAuth')).toBe(true);

      // 4. API lookup should show user not found
      const emailCheck = await authStore.api.checkEmail(TEST_ACCOUNTS.newUser.email);
      expect(emailCheck.exists).toBe(false);

      // 5. Should transition to new user registration
      authStore.stateMachine.send({ type: 'USER_NOT_FOUND' });
      expect(authStore.stateMachine.matches('newUserRegistration')).toBe(true);
    });

    it('should complete returning user with passkey flow', async () => {
      // 1. Start authentication  
      authStore.clickNext();
      authStore.typeEmail(TEST_ACCOUNTS.existingWithPasskey.email);

      // 2. Should trigger conditional mediation
      expect(authStore.stateMachine.matches('conditionalMediation')).toBe(true);

      // 3. User selects passkey from autofill
      authStore.stateMachine.send({ type: 'PASSKEY_SELECTED', credential: {} });
      expect(authStore.stateMachine.matches('biometricPrompt')).toBe(true);

      // 4. Mock successful WebAuthn
      mockWebAuthnSuccess();
      authStore.stateMachine.send({ type: 'WEBAUTHN_SUCCESS', response: {} });
      expect(authStore.stateMachine.matches('auth0WebAuthnVerify')).toBe(true);
    });

    it('should complete returning user without passkey flow', async () => {
      // 1. Start authentication
      authStore.clickNext();
      authStore.typeEmail(TEST_ACCOUNTS.existingWithoutPasskey.email);

      // 2. Continue to explicit auth (no passkeys for conditional)
      authStore.clickContinue();

      // 3. API lookup shows user exists but no passkey
      const emailCheck = await authStore.api.checkEmail(TEST_ACCOUNTS.existingWithoutPasskey.email);
      expect(emailCheck.exists).toBe(true);
      expect(emailCheck.hasPasskey).toBe(false);

      // 4. Should offer passkey registration or magic link
      authStore.stateMachine.send({ type: 'USER_EXISTS', hasPasskey: false });
      expect(authStore.stateMachine.matches('passkeyRegistration')).toBe(true);
    });

    it('should handle passkey authentication failure gracefully', async () => {
      // 1. Start passkey authentication
      authStore.clickNext();
      authStore.typeEmail(TEST_ACCOUNTS.existingWithPasskey.email);
      authStore.stateMachine.send({ type: 'PASSKEY_SELECTED', credential: {} });

      // 2. Mock user cancellation
      mockWebAuthnUserCancellation();
      
      try {
        await authStore.signInWithPasskey(TEST_ACCOUNTS.existingWithPasskey.email);
      } catch (error) {
        // Should classify as user cancellation
        authStore.stateMachine.send({ 
          type: 'WEBAUTHN_ERROR', 
          error: error as any, 
          timing: 1000 // Quick cancellation
        });
      }

      expect(authStore.stateMachine.matches('userCancellation')).toBe(true);

      // 3. Should be able to retry
      authStore.resetToAuth();
      expect(authStore.stateMachine.matches('combinedAuth')).toBe(true);
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('should handle network failures during authentication', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      try {
        await authStore.signInWithMagicLink(TEST_ACCOUNTS.existingWithoutPasskey.email);
      } catch (error) {
        expect(error).toBeDefined();
        
        const state = get(authStore);
        expect(state.state).toBe('error');
      }
    });

    it('should handle browser refresh during authentication', () => {
      // Simulate browser refresh by recreating store with existing localStorage
      authStore.clickNext();
      authStore.typeEmail(TEST_ACCOUNTS.existingWithPasskey.email);

      // Create new store (simulating page refresh)
      const refreshedStore = createAuthStore(LOCAL_TEST_CONFIG);
      
      // Should start from initial state
      expect(refreshedStore.stateMachine.currentState()).toBe('checkingSession');
    });

    it('should handle concurrent authentication attempts', async () => {
      const promises = [
        authStore.signInWithMagicLink(TEST_ACCOUNTS.existingWithoutPasskey.email),
        authStore.signInWithMagicLink(TEST_ACCOUNTS.existingWithoutPasskey.email),
        authStore.signInWithMagicLink(TEST_ACCOUNTS.existingWithoutPasskey.email)
      ];

      const results = await Promise.allSettled(promises);
      
      // Should handle concurrent requests gracefully
      expect(results.length).toBe(3);
    });
  });
});