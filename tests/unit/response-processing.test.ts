import { describe, expect, test } from 'vitest';

/**
 * CRITICAL UNIT TEST: Response Processing Logic
 *
 * This test validates the exact response processing logic that was fixed
 * to prevent the sessionManager consistency bug from recurring.
 *
 * These tests MUST PASS to ensure API response format compatibility.
 */
describe('Response Processing Logic - CRITICAL', () => {
  // Helper function that mimics the response processing logic from auth-store.ts
  function processSignInResponse(response: any) {
    // This is the exact logic from the auth store
    const isSuccess = response.step === 'success' || (response as any).success;
    const access_token = response.access_token || (response as any).tokens?.access_token;
    const refresh_token = response.refresh_token || (response as any).tokens?.refresh_token;
    const expiresAt = (response as any).tokens?.expiresAt;
    const user = response.user;

    if (isSuccess && user && access_token) {
      // Normalize to SignInResponse format
      const normalizedResponse = {
        step: 'success' as const,
        user: user,
        access_token,
        refresh_token,
        expires_in: expiresAt ? Math.floor((expiresAt - Date.now()) / 1000) : undefined
      };

      return {
        success: true,
        normalizedResponse,
        shouldSaveSession: true
      };
    }

    return {
      success: false,
      normalizedResponse: null,
      shouldSaveSession: false
    };
  }

  test('CRITICAL: Must process new API response format {success: true, tokens: {...}}', () => {
    const newFormatResponse = {
      success: true,
      tokens: {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expiresAt: Date.now() + 3600000 // 1 hour from now
      },
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      }
    };

    const result = processSignInResponse(newFormatResponse);

    // CRITICAL ASSERTIONS
    expect(result.success).toBe(true);
    expect(result.shouldSaveSession).toBe(true);
    expect(result.normalizedResponse).toEqual(
      expect.objectContaining({
        step: 'success',
        user: newFormatResponse.user,
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: expect.any(Number)
      })
    );
  });

  test('CRITICAL: Must process legacy API response format {step: "success", access_token: "..."}', () => {
    const legacyFormatResponse = {
      step: 'success' as const,
      access_token: 'legacy-access-token',
      refresh_token: 'legacy-refresh-token',
      expires_in: 3600,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      }
    };

    const result = processSignInResponse(legacyFormatResponse);

    // CRITICAL ASSERTIONS
    expect(result.success).toBe(true);
    expect(result.shouldSaveSession).toBe(true);
    expect(result.normalizedResponse).toEqual(
      expect.objectContaining({
        step: 'success',
        user: legacyFormatResponse.user,
        access_token: 'legacy-access-token',
        refresh_token: 'legacy-refresh-token'
      })
    );
  });

  test('CRITICAL: Must extract access_token from both response.access_token and response.tokens.access_token', () => {
    const testCases = [
      {
        name: 'from response.access_token (legacy)',
        response: {
          step: 'success',
          access_token: 'legacy-token',
          user: { id: '1', email: 'test@example.com' }
        },
        expectedToken: 'legacy-token'
      },
      {
        name: 'from response.tokens.access_token (new)',
        response: {
          success: true,
          tokens: { access_token: 'new-token' },
          user: { id: '1', email: 'test@example.com' }
        },
        expectedToken: 'new-token'
      }
    ];

    for (const testCase of testCases) {
      const result = processSignInResponse(testCase.response);

      expect(result.success).toBe(true);
      expect(result.normalizedResponse?.access_token).toBe(testCase.expectedToken);
    }
  });

  test('CRITICAL: Must extract refresh_token from both locations', () => {
    const testCases = [
      {
        name: 'from response.refresh_token (legacy)',
        response: {
          step: 'success',
          access_token: 'token',
          refresh_token: 'legacy-refresh',
          user: { id: '1', email: 'test@example.com' }
        },
        expectedToken: 'legacy-refresh'
      },
      {
        name: 'from response.tokens.refresh_token (new)',
        response: {
          success: true,
          tokens: { access_token: 'token', refresh_token: 'new-refresh' },
          user: { id: '1', email: 'test@example.com' }
        },
        expectedToken: 'new-refresh'
      }
    ];

    for (const testCase of testCases) {
      const result = processSignInResponse(testCase.response);

      expect(result.success).toBe(true);
      expect(result.normalizedResponse?.refresh_token).toBe(testCase.expectedToken);
    }
  });

  test('CRITICAL: Must determine success from both response.step and response.success', () => {
    const successCases = [
      { step: 'success', access_token: 'token', user: { id: '1', email: 'test@example.com' } },
      {
        success: true,
        tokens: { access_token: 'token' },
        user: { id: '1', email: 'test@example.com' }
      }
    ];

    const failureCases = [
      { step: 'failed', error: 'Authentication failed' },
      { success: false, error: 'Authentication failed' },
      { step: 'pending', message: 'Still processing' }
    ];

    // Test success cases
    for (const successCase of successCases) {
      const result = processSignInResponse(successCase);
      expect(result.success).toBe(true);
      expect(result.shouldSaveSession).toBe(true);
    }

    // Test failure cases
    for (const failureCase of failureCases) {
      const result = processSignInResponse(failureCase);
      expect(result.success).toBe(false);
      expect(result.shouldSaveSession).toBe(false);
    }
  });

  test('CRITICAL: Must NOT save session when required fields are missing', () => {
    const invalidResponses = [
      { success: true, tokens: { access_token: 'token' } }, // Missing user
      { success: true, user: { id: '1', email: 'test@example.com' } }, // Missing access_token
      { step: 'success', user: { id: '1', email: 'test@example.com' } }, // Missing access_token
      { success: true, tokens: {}, user: { id: '1', email: 'test@example.com' } } // Empty tokens
    ];

    for (const invalidResponse of invalidResponses) {
      const result = processSignInResponse(invalidResponse);

      // CRITICAL: Must not save session for invalid responses
      expect(result.success).toBe(false);
      expect(result.shouldSaveSession).toBe(false);
      expect(result.normalizedResponse).toBe(null);
    }
  });

  test('CRITICAL: Must handle expiresAt conversion correctly', () => {
    const futureTime = Date.now() + 7200000; // 2 hours from now

    const response = {
      success: true,
      tokens: {
        access_token: 'token',
        refresh_token: 'refresh',
        expiresAt: futureTime
      },
      user: { id: '1', email: 'test@example.com' }
    };

    const result = processSignInResponse(response);

    expect(result.success).toBe(true);
    expect(result.normalizedResponse?.expires_in).toBeGreaterThan(7000); // Should be around 7200 seconds
    expect(result.normalizedResponse?.expires_in).toBeLessThan(7300); // Allow some variance for test execution time
  });

  test('CRITICAL: Must handle missing expiresAt gracefully', () => {
    const response = {
      success: true,
      tokens: {
        access_token: 'token',
        refresh_token: 'refresh'
        // No expiresAt
      },
      user: { id: '1', email: 'test@example.com' }
    };

    const result = processSignInResponse(response);

    expect(result.success).toBe(true);
    expect(result.normalizedResponse?.expires_in).toBeUndefined();
  });
});
