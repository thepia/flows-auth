import { describe, expect, test, vi } from 'vitest';
import type { AuthApiClient } from '../../src/core/api/auth-api.js';
import { CONFIG_DEFAULTS, createAuthStore } from '../../src/core/stores/auth-store.js';

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
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
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
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
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
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
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
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
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
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
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
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
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
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
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
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
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
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
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
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
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
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
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
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
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
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
      });

      store.setApiError('Test error');

      const errorState = store.error.getState();
      expect(errorState.apiError).toBeDefined();
      expect(errorState.uiError).toBeDefined();
      expect(errorState.apiError?.message).toBe(errorState.uiError?.message);
    });

    test('should clear only uiError with clearUiError', () => {
      const store = createAuthStore({
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
      });

      store.setApiError('Test error');
      store.error.getState().clearUiError();

      const errorState = store.error.getState();
      expect(errorState.apiError).toBeDefined();
      expect(errorState.uiError).toBeNull();
    });

    test('should clear both errors with clearApiError', () => {
      const store = createAuthStore({
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode: 'app',
        clientId: 'test-client',
        enablePasskeys: true
      });

      store.setApiError('Test error');
      store.error.getState().clearApiError();

      const errorState = store.error.getState();
      expect(errorState.apiError).toBeNull();
      expect(errorState.uiError).toBeNull();
    });
  });

  /**
   * checkUser is the sign-in flow's first network call. A failure there is
   * classified as one distinct 'error.authUnavailable' state (app/API isn't
   * usable right now) rather than the generic per-message codes above,
   * *only* when `context.method === 'checkUser'` -- these tests cover the
   * "obvious scenarios" this exists for: an unregistered appCode (404), a
   * CORS/permissions rejection (403), a broken server (5xx), and being
   * unable to reach the server at all (network/CORS, no HTTP status). Each
   * mirrors the exact shape handleErrorResponse() (auth-api.ts) now
   * produces, including the `details.httpStatus` it preserves.
   */
  describe('Availability classification (checkUser sanity-gate)', () => {
    function makeStore(appCode = 'react-demo') {
      return createAuthStore({
        ...CONFIG_DEFAULTS,
        domain: 'thepia.net',
        appCode,
        clientId: 'test-client',
        enablePasskeys: true
      });
    }

    test('404 with no recognizable body (unregistered appCode) -> error.authUnavailable', () => {
      const store = makeStore('unregistered-app');
      const error = { code: 'http_error', message: 'HTTP 404: Not Found', details: { httpStatus: 404 } };

      store.setApiError(error, { method: 'checkUser', email: 'a@b.com', appCode: 'unregistered-app' });

      const apiError = store.error.getState().apiError;
      expect(apiError?.code).toBe('error.authUnavailable');
      expect(apiError?.httpStatus).toBe(404);
      expect(apiError?.retryable).toBe(false);
      expect(apiError?.diagnostic).toContain('unregistered-app');
      expect(apiError?.diagnostic).toContain('404');
    });

    test('403 (CORS/app permissions rejected) -> error.authUnavailable', () => {
      const store = makeStore();
      const error = { code: 'http_error', message: 'HTTP 403: Forbidden', details: { httpStatus: 403 } };

      store.setApiError(error, { method: 'checkUser', email: 'a@b.com', appCode: 'react-demo' });

      const apiError = store.error.getState().apiError;
      expect(apiError?.code).toBe('error.authUnavailable');
      expect(apiError?.httpStatus).toBe(403);
      expect(apiError?.retryable).toBe(false);
      expect(apiError?.diagnostic).toMatch(/forbidden/i);
    });

    test.each([500, 502, 503])('%i server error -> error.authUnavailable, retryable', (status) => {
      const store = makeStore();
      const error = { code: 'http_error', message: `HTTP ${status}: Server Error`, details: { httpStatus: status } };

      store.setApiError(error, { method: 'checkUser', email: 'a@b.com', appCode: 'react-demo' });

      const apiError = store.error.getState().apiError;
      expect(apiError?.code).toBe('error.authUnavailable');
      expect(apiError?.httpStatus).toBe(status);
      expect(apiError?.retryable).toBe(true);
      expect(apiError?.diagnostic).toContain(String(status));
    });

    test('network/CORS failure (no HTTP status at all) -> error.authUnavailable', () => {
      const store = makeStore();
      const error = new TypeError('Failed to fetch');

      store.setApiError(error, { method: 'checkUser', email: 'a@b.com', appCode: 'react-demo' });

      const apiError = store.error.getState().apiError;
      expect(apiError?.code).toBe('error.authUnavailable');
      expect(apiError?.httpStatus).toBeUndefined();
      expect(apiError?.retryable).toBe(true);
      expect(apiError?.diagnostic).toMatch(/network|cors/i);
    });

    test('the same failures are NOT classified as authUnavailable outside the checkUser context', () => {
      const store = makeStore();
      const error = { code: 'http_error', message: 'HTTP 404: Not Found', details: { httpStatus: 404 } };

      // e.g. a 404 mid-flow from a different method should fall through to
      // the generic classification below, not be treated as "app is broken".
      store.setApiError(error, { method: 'verifyEmailCode', email: 'a@b.com' });

      const apiError = store.error.getState().apiError;
      expect(apiError?.code).not.toBe('error.authUnavailable');
    });

    test('a 400 (e.g. malformed sanity-check email) is not treated as an availability failure', () => {
      const store = makeStore();
      const error = { code: 'http_error', message: 'HTTP 400: Bad Request', details: { httpStatus: 400 } };

      store.setApiError(error, { method: 'checkUser', email: 'a@b.com', appCode: 'react-demo' });

      const apiError = store.error.getState().apiError;
      expect(apiError?.code).not.toBe('error.authUnavailable');
    });
  });

  /**
   * checkAuthAvailability() is the sanity ping itself (see auth-store.ts).
   * Off by default -- an earlier version fired it unconditionally on every
   * store creation, which broke every test that didn't fully mock
   * checkEmail, so it's opt-in via `config.checkAuthAvailabilityOnInit`
   * (see the next describe block) or a manual call. These confirm the
   * method itself: reports success/failure correctly, classifies a failure
   * the same way a real user's checkUser would, and never touches
   * signInState/userExists either way.
   */
  describe('checkAuthAvailability()', () => {
    test('resolves true and sets no apiError when check-user succeeds', async () => {
      const checkEmail = vi.fn().mockResolvedValue({ exists: false, hasWebAuthn: false });
      const store = createAuthStore(
        { ...CONFIG_DEFAULTS, domain: 'thepia.net', appCode: 'app', clientId: 'test-client', enablePasskeys: true },
        { checkEmail } as unknown as AuthApiClient
      );

      const available = await store.checkAuthAvailability();

      expect(available).toBe(true);
      expect(store.getState().apiError).toBeNull();
      expect(store.getState().signInState).toBe('emailEntry');
      expect(store.getState().userExists).toBeNull();
    });

    test('resolves false and sets error.authUnavailable when check-user fails', async () => {
      const checkEmail = vi
        .fn()
        .mockRejectedValue({ code: 'http_error', message: 'HTTP 404: Not Found', details: { httpStatus: 404 } });
      const store = createAuthStore(
        { ...CONFIG_DEFAULTS, domain: 'thepia.net', appCode: 'unregistered', clientId: 'test-client', enablePasskeys: true },
        { checkEmail } as unknown as AuthApiClient
      );

      const available = await store.checkAuthAvailability();

      expect(available).toBe(false);
      expect(store.getState().apiError?.code).toBe('error.authUnavailable');
      expect(store.getState().apiError?.diagnostic).toContain('unregistered');
      // Doesn't drive the real sign-in UI -- a real visitor's own checkUser
      // call still starts from a clean slate regardless of this ping.
      expect(store.getState().signInState).toBe('emailEntry');
    });
  });

  /**
   * `config.checkAuthAvailabilityOnInit` -- store-level opt-in that fires
   * checkAuthAvailability() once at createAuthStore() time, so a consumer
   * doesn't have to remember to call it after mount. Framework-agnostic
   * (plain store config, not a React effect or Svelte lifecycle hook).
   */
  describe('config.checkAuthAvailabilityOnInit', () => {
    test('off by default -- does not ping check-user or touch apiError', async () => {
      const checkEmail = vi.fn();
      createAuthStore(
        { ...CONFIG_DEFAULTS, domain: 'thepia.net', appCode: 'app', clientId: 'test-client', enablePasskeys: true },
        { checkEmail } as unknown as AuthApiClient
      );

      // Store creation is synchronous; give any stray async work a tick to
      // land before asserting it never happened.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(checkEmail).not.toHaveBeenCalled();
    });

    test('true -- pings check-user once at store creation and sets error.authUnavailable on failure', async () => {
      const checkEmail = vi
        .fn()
        .mockRejectedValue({ code: 'http_error', message: 'HTTP 404: Not Found', details: { httpStatus: 404 } });
      const store = createAuthStore(
        {
          ...CONFIG_DEFAULTS,
          domain: 'thepia.net',
          appCode: 'unregistered',
          clientId: 'test-client',
          enablePasskeys: true,
          checkAuthAvailabilityOnInit: true
        },
        { checkEmail } as unknown as AuthApiClient
      );

      // The ping is fire-and-forget at store creation -- wait for it.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(checkEmail).toHaveBeenCalledTimes(1);
      expect(store.getState().apiError?.code).toBe('error.authUnavailable');
      expect(store.getState().apiError?.diagnostic).toContain('unregistered');
      expect(store.getState().signInState).toBe('emailEntry');
    });

    test('true -- sets no apiError when check-user succeeds', async () => {
      const checkEmail = vi.fn().mockResolvedValue({ exists: false, hasWebAuthn: false });
      const store = createAuthStore(
        {
          ...CONFIG_DEFAULTS,
          domain: 'thepia.net',
          appCode: 'app',
          clientId: 'test-client',
          enablePasskeys: true,
          checkAuthAvailabilityOnInit: true
        },
        { checkEmail } as unknown as AuthApiClient
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(checkEmail).toHaveBeenCalledTimes(1);
      expect(store.getState().apiError).toBeNull();
    });
  });
});
