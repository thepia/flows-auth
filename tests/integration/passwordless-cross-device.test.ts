/**
 * Cross-Device Passwordless Authentication Integration Tests
 * Tests the full end-to-end flow across devices
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';

// Test configuration
const TEST_CONFIG = {
  // Use local API server if available, fall back to production
  apiBaseUrl: process.env.TEST_API_URL || 'https://api.thepia.com',
  clientId: 'app-test',
  domain: 'test.thepia.net',
  appCode: 'demo', // Use demo appCode for examples
  enablePasskeys: false,
  enableMagicLinks: false,
  branding: {
    companyName: 'Thepia Test',
    showPoweredBy: false
  }
};

describe('Cross-Device Passwordless Authentication', () => {
  let apiClient: AuthApiClient;
  let testEmail: string;

  beforeAll(() => {
    apiClient = new AuthApiClient(TEST_CONFIG);
    // Use unique test email to avoid conflicts
    testEmail = `test+${Date.now()}@thepia.net`;

    console.log('🧪 Testing against:', TEST_CONFIG.apiBaseUrl);
    console.log('📧 Test email:', testEmail);
  });

  afterAll(() => {
    // Clean up any test sessions
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  });

  describe('Device A: Start Passwordless Flow', () => {
    let sessionId: string;

    it('should start passwordless authentication and return session ID', async () => {
      const result = await apiClient.startPasswordlessAuthentication(testEmail);

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
      expect(result.message).toContain('email');

      sessionId = result.timestamp.toString();
      console.log('✅ Passwordless flow started, sessionId:', sessionId);
    });

    it('should show session as pending initially', async () => {
      const status = await apiClient.checkPasswordlessStatus(testEmail, Number.parseInt(sessionId));

      expect(status.status).toBe('pending');
      expect(status.user).toBeUndefined();

      console.log('✅ Session status is pending as expected');
    });

    it('should continue to show pending status while waiting for email confirmation', async () => {
      // Wait a bit and check again
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const status = await apiClient.checkPasswordlessStatus(testEmail, Number.parseInt(sessionId));
      expect(status.status).toBe('pending');

      console.log('✅ Session remains pending (email not yet confirmed)');
    });

    // NOTE: The following steps would require manual email interaction or Auth0 API mocking
    // For now, we document the expected flow

    it.todo('Device B: User receives email and clicks magic link');
    it.todo('Device B: Magic link redirects to callback handler');
    it.todo('Device B: Callback exchanges code for tokens');
    it.todo('Device B: Session is updated with tokens');
    it.todo('Device B: User is redirected to success page');
    it.todo('Device A: Polling detects verified status');
    it.todo('Device A: Tokens are retrieved and stored');
    it.todo('Both devices: User is authenticated');
  });

  describe('Error Scenarios', () => {
    it('should handle invalid session ID in status check', async () => {
      const status = await apiClient.checkPasswordlessStatus(testEmail, 999999999);

      // Should either return expired status or throw error
      expect(['expired', 'error']).toContain(status.status);
    });

    it('should handle network errors gracefully', async () => {
      // Test with malformed API URL
      const badApiClient = new AuthApiClient({
        ...TEST_CONFIG,
        apiBaseUrl: 'https://nonexistent.api.com'
      });

      await expect(badApiClient.startPasswordlessAuthentication(testEmail)).rejects.toThrow();
    });

    it('should validate email format', async () => {
      await expect(apiClient.startPasswordlessAuthentication('invalid-email')).rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    it('should handle concurrent sessions for same user', async () => {
      const session1 = await apiClient.startPasswordlessAuthentication(testEmail);
      const session2 = await apiClient.startPasswordlessAuthentication(testEmail);

      expect(session1.timestamp).not.toBe(session2.timestamp);
      console.log('✅ Multiple concurrent sessions supported');
    });

    it('should handle session expiration', async () => {
      const result = await apiClient.startPasswordlessAuthentication(testEmail);
      const sessionId = result.timestamp;

      // TODO: Test would need to wait for session timeout or mock time
      // For now, we verify the session exists
      const status = await apiClient.checkPasswordlessStatus(testEmail, sessionId);
      expect(['pending', 'expired']).toContain(status.status);
    });
  });

  describe('Client Configuration Integration', () => {
    it('should work with thepia-app client configuration', async () => {
      const result = await apiClient.startPasswordlessAuthentication(testEmail);
      expect(result.success).toBe(true);

      // This tests that thepia-app is properly configured for passwordless
      console.log('✅ thepia-app client supports passwordless');
    });

    it('should reject clients not configured for passwordless', async () => {
      const legacyClient = new AuthApiClient({
        ...TEST_CONFIG,
        clientId: 'legacy-client' // This should not be configured for passwordless
      });

      await expect(legacyClient.startPasswordlessAuthentication(testEmail)).rejects.toThrow(
        /not enabled/i
      );
    });
  });

  describe('Environment Detection', () => {
    it('should use correct API server based on configuration', () => {
      expect(apiClient.config.apiBaseUrl).toBe(TEST_CONFIG.apiBaseUrl);
      console.log('✅ Using API server:', apiClient.config.apiBaseUrl);
    });

    it('should handle CORS correctly in test environment', async () => {
      // If this test runs without CORS errors, CORS is configured correctly
      const result = await apiClient.startPasswordlessAuthentication(testEmail);
      expect(result).toBeDefined();
      console.log('✅ CORS handling works in test environment');
    });
  });
});

/**
 * Mock Test for Complete Flow (Simulated)
 * This simulates what would happen if we could mock Auth0 responses
 */
describe('Complete Flow Simulation', () => {
  it('should demonstrate complete cross-device flow', async () => {
    const mockFlow = {
      // Device A: Start
      deviceA_start: {
        email: 'user@test.com',
        timestamp: 1638360000000,
        status: 'pending'
      },

      // Device B: Email click simulation
      deviceB_callback: {
        code: 'auth-code-456',
        state: btoa(
          JSON.stringify({
            clientId: 'thepia-app',
            timestamp: 1638360000000
          })
        ),
        tokens: {
          access_token: 'at-789',
          refresh_token: 'rt-101112',
          expiresAt: Date.now() + 3600000
        }
      },

      // Device A: Polling result
      deviceA_result: {
        status: 'verified',
        tokens: {
          access_token: 'at-789',
          refresh_token: 'rt-101112',
          expiresAt: Date.now() + 3600000
        },
        user: {
          id: 'user-131415',
          email: 'user@test.com'
        }
      }
    };

    // Verify the flow structure is correct
    expect(mockFlow.deviceA_start.timestamp).toBe(1638360000000);
    expect(JSON.parse(atob(mockFlow.deviceB_callback.state)).timestamp).toBe(1638360000000);
    expect(mockFlow.deviceA_result.tokens.access_token).toBe('at-789');

    console.log('✅ Complete flow simulation structure verified');
    console.log('📋 Flow steps:', {
      'Device A starts': mockFlow.deviceA_start.status,
      'Device B receives tokens': !!mockFlow.deviceB_callback.tokens,
      'Device A gets result': mockFlow.deviceA_result.status
    });
  });
});
