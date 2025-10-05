import { describe, expect, test } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';

/**
 * Unit Test: Error Store Classification Logic
 *
 * Tests the error classification logic in isolation by directly calling store.setApiError().
 *
 * This is a UNIT test because:
 * - NO network calls are made (no API interaction)
 * - Tests only the error store's classification logic
 * - Uses auth store purely as a container to access error.getState()
 * - appCode value is irrelevant (no routing tested)
 *
 * What's tested:
 * - Error message extraction from different error formats
 * - Error code classification based on message patterns
 * - Error object transformation to user-friendly messages
 *
 * What's NOT tested:
 * - Actual API calls or network behavior
 * - Endpoint routing (appCode doesn't matter here)
 * - Cross-module error propagation
 */
describe('Error Store Classification', () => {
  test('should handle AuthError object from API through entire flow', () => {
    const store = createAuthStore({
      apiBaseUrl: 'https://api.thepia.com',
      domain: 'thepia.net',
      appCode: 'demo'
    });

    // Simulate the EXACT error object from handleErrorResponse (auth-api.ts:183-186)
    const apiError = {
      code: 'unknown_error',
      message: 'Invalid or expired verification code',
      details: undefined
    };

    // This is what email-auth.ts:231 does - throws the raw error
    // Then auth-store.ts:291 catches it and does this:
    const err = apiError;

    // auth-store.ts:301-305 - Extract message for event
    const errorMessage =
      err instanceof Error
        ? err.message
        : err && typeof err === 'object' && 'message' in err
          ? String((err as any).message)
          : String(err);

    // Verify message extraction works
    expect(errorMessage).toBe('Invalid or expired verification code');
    expect(errorMessage).not.toBe('[object Object]');

    // auth-store.ts:307-310 - Create event error object
    const eventError = { code: 'verification_failed', message: errorMessage };

    // auth-store.ts:164 - This is what gets passed to setApiError
    store.setApiError(eventError, {
      method: 'verifyEmailCode',
      email: 'test@example.com'
    });

    // Verify the final classified error
    const apiErrorResult = store.error.getState().apiError;
    expect(apiErrorResult).toBeDefined();
    expect(apiErrorResult?.message).toBe('Invalid or expired verification code');
    expect(apiErrorResult?.message).not.toBe('[object Object]');
    expect(apiErrorResult?.code).toBe('error.invalidCode');
  });

  test('should handle the EXACT error flow with unknown_error code', () => {
    const store = createAuthStore({
      apiBaseUrl: 'https://api.thepia.com',
      domain: 'thepia.net',
      appCode: 'demo'
    });

    // Step 1: API returns this (auth-api.ts:183-186)
    const handleErrorResponseResult = {
      code: 'unknown_error',
      message: 'Invalid or expired verification code',
      details: undefined
    };

    // Step 2: auth-api.ts:139 throws this
    const thrownError = handleErrorResponseResult;

    // Step 3: email-auth.ts:231 re-throws it
    const emailAuthError = thrownError;

    // Step 4: auth-store.ts:295 calls setApiError with the original error
    store.setApiError(emailAuthError, {
      method: 'verifyEmailCode',
      email: 'test@example.com'
    });

    // Step 5: Verify classification happened correctly
    const result = store.error.getState().apiError;
    expect(result?.code).toBe('error.invalidCode'); // Should be classified by message pattern
    expect(result?.message).toBe('Invalid or expired verification code');
    expect(result?.message).not.toContain('[object Object]');
  });

  test('should handle network_error with HTTP 500 message', () => {
    const store = createAuthStore({
      apiBaseUrl: 'https://api.thepia.com',
      domain: 'thepia.net',
      appCode: 'demo'
    });

    // From handleErrorResponse (auth-api.ts:197-200)
    const networkError = {
      code: 'network_error',
      message: 'HTTP 500: Internal Server Error'
    };

    store.setApiError(networkError);

    const result = store.error.getState().apiError;
    expect(result?.code).toBe('error.serviceUnavailable');
    expect(result?.message).toBe('HTTP 500: Internal Server Error');
  });

  test('should handle rate_limit_exceeded from server', () => {
    const store = createAuthStore({
      apiBaseUrl: 'https://api.thepia.com',
      domain: 'thepia.net',
      appCode: 'demo'
    });

    // From handleErrorResponse (auth-api.ts:166-170)
    const rateLimitError = {
      code: 'rate_limit_exceeded',
      message: 'Too many requests. Please try again in a moment.',
      details: undefined
    };

    store.setApiError(rateLimitError);

    const result = store.error.getState().apiError;
    expect(result?.code).toBe('error.rateLimited');
    expect(result?.message).toBe('Too many requests. Please try again in a moment.');
  });

  test('should handle error with nested error object in step format', () => {
    const store = createAuthStore({
      apiBaseUrl: 'https://api.thepia.com',
      domain: 'thepia.net',
      appCode: 'app'
    });

    // From handleErrorResponse (auth-api.ts:174-179)
    const nestedError = {
      code: 'invalid_one_time_code',
      message: 'The code you entered is invalid',
      details: undefined
    };

    store.setApiError(nestedError);

    const result = store.error.getState().apiError;
    expect(result?.code).toBe('error.invalidCode');
    expect(result?.message).toBe('The code you entered is invalid');
  });
});
