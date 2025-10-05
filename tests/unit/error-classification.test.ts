import { describe, expect, test } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';

/**
 * Unit Test: Error Message Extraction and Classification
 *
 * Tests how different error formats are classified and transformed
 * into user-friendly error messages by the error store.
 *
 * This is a UNIT test because:
 * - NO network calls are made (no API interaction)
 * - Tests only the error store's message extraction logic
 * - Uses auth store purely as a container to access error.getState()
 * - appCode value is irrelevant (no routing tested)
 *
 * What's tested:
 * - Extraction of messages from Error instances, strings, objects
 * - Prevention of [object Object] errors
 * - Error code classification based on error properties
 *
 * What's NOT tested:
 * - Actual API calls or network behavior
 * - Endpoint routing
 */
describe('Error Classification', () => {
  describe('Error message extraction', () => {
    test('should extract message from Error instance', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      const error = new Error('Invalid or expired verification code');
      store.setApiError(error, { method: 'verifyEmailCode', email: 'test@example.com' });

      const apiError = store.error.getState().apiError;
      expect(apiError).toBeDefined();
      expect(apiError?.message).toBe('Invalid or expired verification code');
      expect(apiError?.code).toBe('error.invalidCode');
    });

    test('should extract message from plain string', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      const error = 'Network connection failed';
      store.setApiError(error, { method: 'verifyEmailCode' });

      const apiError = store.error.getState().apiError;
      expect(apiError).toBeDefined();
      expect(apiError?.message).toBe('Network connection failed');
      expect(apiError?.code).toBe('error.network');
    });

    test('should extract message from object with message property', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      const error = {
        code: 'unknown_error',
        message: 'Invalid or expired verification code',
        details: undefined
      };
      store.setApiError(error, { method: 'verifyEmailCode', email: 'test@example.com' });

      const apiError = store.error.getState().apiError;
      expect(apiError).toBeDefined();
      expect(apiError?.message).toBe('Invalid or expired verification code');
      expect(apiError?.message).not.toBe('[object Object]');
      expect(apiError?.code).toBe('error.invalidCode');
    });

    test('should extract message from object with error property', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      const error = {
        error: 'Rate limit exceeded'
      };
      store.setApiError(error, { method: 'sendEmailCode' });

      const apiError = store.error.getState().apiError;
      expect(apiError).toBeDefined();
      expect(apiError?.message).toBe('Rate limit exceeded');
      expect(apiError?.message).not.toBe('[object Object]');
    });

    test('should JSON.stringify object if no message or error property', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      const error = {
        status: 500,
        statusText: 'Internal Server Error'
      };
      store.setApiError(error, { method: 'verifyEmailCode' });

      const apiError = store.error.getState().apiError;
      expect(apiError).toBeDefined();
      expect(apiError?.message).toContain('500');
      expect(apiError?.message).toContain('Internal Server Error');
      expect(apiError?.message).not.toBe('[object Object]');
    });
  });

  describe('Error code classification', () => {
    test('should classify verification code errors as error.invalidCode', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      const testCases = [
        'Invalid verification code',
        'Expired verification code',
        'invalid_one_time_code',
        'Invalid code provided'
      ];

      for (const message of testCases) {
        store.setApiError(message, { method: 'verifyEmailCode' });
        const apiError = store.error.getState().apiError;
        expect(apiError?.code).toBe('error.invalidCode');
      }
    });

    test('should classify network errors as error.network', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      const testCases = ['Failed to fetch', 'Network error occurred', 'fetch failed'];

      for (const message of testCases) {
        store.setApiError(message);
        const apiError = store.error.getState().apiError;
        expect(apiError?.code).toBe('error.network');
      }
    });

    test('should classify rate limit errors as error.rateLimited', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      const testCases = ['Rate limit exceeded', 'Too many requests', '429 Too Many Requests'];

      for (const message of testCases) {
        store.setApiError(message);
        const apiError = store.error.getState().apiError;
        expect(apiError?.code).toBe('error.rateLimited');
      }
    });

    test('should classify service unavailable errors', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      const testCases = [
        '404 Not Found',
        '500 Internal Server Error',
        '502 Bad Gateway',
        '503 Service Unavailable',
        'Endpoint not found'
      ];

      for (const message of testCases) {
        store.setApiError(message);
        const apiError = store.error.getState().apiError;
        expect(apiError?.code).toBe('error.serviceUnavailable');
      }
    });
  });

  describe('API response error format', () => {
    test('should handle AuthError format from handleErrorResponse', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      // This is the exact format returned by auth-api.ts handleErrorResponse()
      const authError = {
        code: 'unknown_error',
        message: 'Invalid or expired verification code',
        details: undefined
      };

      store.setApiError(authError, { method: 'verifyEmailCode', email: 'test@example.com' });

      const apiError = store.error.getState().apiError;
      expect(apiError).toBeDefined();
      expect(apiError?.message).toBe('Invalid or expired verification code');
      expect(apiError?.message).not.toBe('[object Object]');
      expect(apiError?.code).toBe('error.invalidCode');
    });

    test('should handle rate limit error format from handleErrorResponse', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      const authError = {
        code: 'rate_limit_exceeded',
        message: 'Too many requests. Please try again in a moment.',
        details: undefined
      };

      store.setApiError(authError, { method: 'sendEmailCode' });

      const apiError = store.error.getState().apiError;
      expect(apiError).toBeDefined();
      expect(apiError?.message).toBe('Too many requests. Please try again in a moment.');
      expect(apiError?.code).toBe('error.rateLimited');
    });

    test('should handle network error format from handleErrorResponse', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      const authError = {
        code: 'network_error',
        message: 'HTTP 500: Internal Server Error'
      };

      store.setApiError(authError);

      const apiError = store.error.getState().apiError;
      expect(apiError).toBeDefined();
      expect(apiError?.message).toBe('HTTP 500: Internal Server Error');
      expect(apiError?.code).toBe('error.serviceUnavailable');
    });
  });

  describe('uiError vs apiError separation', () => {
    test('should set both uiError and apiError on setApiError', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      store.setApiError('Test error');

      const errorState = store.error.getState();
      expect(errorState.apiError).toBeDefined();
      expect(errorState.uiError).toBeDefined();
      expect(errorState.apiError?.message).toBe(errorState.uiError?.message);
    });

    test('should clear only uiError with clearUiError', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      store.setApiError('Test error');
      store.error.getState().clearUiError();

      const errorState = store.error.getState();
      expect(errorState.apiError).toBeDefined();
      expect(errorState.uiError).toBeNull();
    });

    test('should clear both errors with clearApiError', () => {
      const store = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        appCode: 'app'
      });

      store.setApiError('Test error');
      store.error.getState().clearApiError();

      const errorState = store.error.getState();
      expect(errorState.apiError).toBeNull();
      expect(errorState.uiError).toBeNull();
    });
  });
});
