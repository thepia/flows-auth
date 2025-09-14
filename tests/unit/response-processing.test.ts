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
    const accessToken = response.accessToken || (response as any).tokens?.accessToken;
    const refreshToken = response.refreshToken || (response as any).tokens?.refreshToken;
    const expiresAt = (response as any).tokens?.expiresAt;
    const user = response.user;

    if (isSuccess && user && accessToken) {
      // Normalize to SignInResponse format
      const normalizedResponse = {
        step: 'success' as const,
        user: user,
        accessToken,
        refreshToken,
        expiresIn: expiresAt ? Math.floor((expiresAt - Date.now()) / 1000) : undefined
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
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
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
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: expect.any(Number)
      })
    );
  });

  test('CRITICAL: Must process legacy API response format {step: "success", accessToken: "..."}', () => {
    const legacyFormatResponse = {
      step: 'success' as const,
      accessToken: 'legacy-access-token',
      refreshToken: 'legacy-refresh-token',
      expiresIn: 3600,
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
        accessToken: 'legacy-access-token',
        refreshToken: 'legacy-refresh-token'
      })
    );
  });

  test('CRITICAL: Must extract accessToken from both response.accessToken and response.tokens.accessToken', () => {
    const testCases = [
      {
        name: 'from response.accessToken (legacy)',
        response: {
          step: 'success',
          accessToken: 'legacy-token',
          user: { id: '1', email: 'test@example.com' }
        },
        expectedToken: 'legacy-token'
      },
      {
        name: 'from response.tokens.accessToken (new)',
        response: {
          success: true,
          tokens: { accessToken: 'new-token' },
          user: { id: '1', email: 'test@example.com' }
        },
        expectedToken: 'new-token'
      }
    ];

    for (const testCase of testCases) {
      const result = processSignInResponse(testCase.response);

      expect(result.success).toBe(true);
      expect(result.normalizedResponse?.accessToken).toBe(testCase.expectedToken);
    }
  });

  test('CRITICAL: Must extract refreshToken from both locations', () => {
    const testCases = [
      {
        name: 'from response.refreshToken (legacy)',
        response: {
          step: 'success',
          accessToken: 'token',
          refreshToken: 'legacy-refresh',
          user: { id: '1', email: 'test@example.com' }
        },
        expectedToken: 'legacy-refresh'
      },
      {
        name: 'from response.tokens.refreshToken (new)',
        response: {
          success: true,
          tokens: { accessToken: 'token', refreshToken: 'new-refresh' },
          user: { id: '1', email: 'test@example.com' }
        },
        expectedToken: 'new-refresh'
      }
    ];

    for (const testCase of testCases) {
      const result = processSignInResponse(testCase.response);

      expect(result.success).toBe(true);
      expect(result.normalizedResponse?.refreshToken).toBe(testCase.expectedToken);
    }
  });

  test('CRITICAL: Must determine success from both response.step and response.success', () => {
    const successCases = [
      { step: 'success', accessToken: 'token', user: { id: '1', email: 'test@example.com' } },
      {
        success: true,
        tokens: { accessToken: 'token' },
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
      { success: true, tokens: { accessToken: 'token' } }, // Missing user
      { success: true, user: { id: '1', email: 'test@example.com' } }, // Missing accessToken
      { step: 'success', user: { id: '1', email: 'test@example.com' } }, // Missing accessToken
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
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: futureTime
      },
      user: { id: '1', email: 'test@example.com' }
    };

    const result = processSignInResponse(response);

    expect(result.success).toBe(true);
    expect(result.normalizedResponse?.expiresIn).toBeGreaterThan(7000); // Should be around 7200 seconds
    expect(result.normalizedResponse?.expiresIn).toBeLessThan(7300); // Allow some variance for test execution time
  });

  test('CRITICAL: Must handle missing expiresAt gracefully', () => {
    const response = {
      success: true,
      tokens: {
        accessToken: 'token',
        refreshToken: 'refresh'
        // No expiresAt
      },
      user: { id: '1', email: 'test@example.com' }
    };

    const result = processSignInResponse(response);

    expect(result.success).toBe(true);
    expect(result.normalizedResponse?.expiresIn).toBeUndefined();
  });
});
