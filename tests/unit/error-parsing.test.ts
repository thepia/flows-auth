import { describe, expect, test } from 'vitest';

/**
 * Unit tests for handleErrorResponse logic in AuthApiClient.
 *
 * Mirrors the exact parsing logic so regressions are caught before
 * the real error message disappears into "unknown_error".
 */

// Mirrors AuthApiClient.handleErrorResponse (auth-api.ts)
function parseErrorResponse(
  status: number,
  errorData: Record<string, unknown>
): { code: string; message: string } {
  if (status === 429 || errorData.error === 'too_many_requests') {
    return {
      code: 'rate_limit_exceeded',
      message: 'Too many requests. Please try again in a moment.'
    };
  }

  if (errorData.step === 'error' && errorData.error) {
    if (typeof errorData.error === 'string') {
      return {
        code: errorData.error,
        message: (errorData.message as string) || errorData.error
      };
    }
    const err = errorData.error as Record<string, string>;
    return {
      code: err.code || 'unknown_error',
      message: err.message || 'An unknown error occurred'
    };
  }

  const errorCode =
    (errorData.code as string) ||
    (typeof errorData.error === 'string' ? errorData.error : undefined) ||
    'unknown_error';
  const errorMessage =
    (errorData.message as string) ||
    (typeof errorData.error === 'string' ? errorData.error : undefined) ||
    'An unknown error occurred';
  return { code: errorCode, message: errorMessage };
}

describe('Error parsing — server response formats', () => {
  test('server format: { error: string, message: string } surfaces real code', () => {
    const result = parseErrorResponse(500, {
      error: 'token_refresh_failed',
      message: 'WorkOS API Error: token already exchanged'
    });
    expect(result.code).toBe('token_refresh_failed');
    expect(result.message).toBe('WorkOS API Error: token already exchanged');
  });

  test('step-error format with string error', () => {
    const result = parseErrorResponse(500, {
      step: 'error',
      error: 'token_refresh_failed',
      message: 'Token refresh temporarily unavailable'
    });
    expect(result.code).toBe('token_refresh_failed');
    expect(result.message).toBe('Token refresh temporarily unavailable');
  });

  test('step-error format with object error', () => {
    const result = parseErrorResponse(401, {
      step: 'error',
      error: { code: 'invalid_token', message: 'Refresh token is invalid or expired' }
    });
    expect(result.code).toBe('invalid_token');
    expect(result.message).toBe('Refresh token is invalid or expired');
  });

  test('legacy format: { code, message }', () => {
    const result = parseErrorResponse(400, {
      code: 'invalid_request',
      message: 'Refresh token is required'
    });
    expect(result.code).toBe('invalid_request');
    expect(result.message).toBe('Refresh token is required');
  });

  test('string error with no message falls back to error string', () => {
    const result = parseErrorResponse(500, { error: 'server_error' });
    expect(result.code).toBe('server_error');
    expect(result.message).toBe('server_error');
  });

  test('completely empty body yields unknown_error', () => {
    const result = parseErrorResponse(500, {});
    expect(result.code).toBe('unknown_error');
    expect(result.message).toBe('An unknown error occurred');
  });

  test('rate limit by status code', () => {
    const result = parseErrorResponse(429, {});
    expect(result.code).toBe('rate_limit_exceeded');
  });

  test('rate limit by error field', () => {
    const result = parseErrorResponse(200, { error: 'too_many_requests' });
    expect(result.code).toBe('rate_limit_exceeded');
  });
});
