/**
 * Error Response Utilities Unit Tests
 * RFC 9457 Problem Details construction, baseUri parameterization, and the
 * StandardErrors convenience helpers.
 */

import { describe, expect, it } from 'vitest';
import {
  createErrorTypes,
  createProblemResponse,
  createStandardErrors,
  createValidationErrorResponse
} from '../../src/server/error-responses.js';

const BASE_URI = 'https://api.example.com/problems';

describe('createProblemResponse', () => {
  it('builds a response with the given status and problem+json content type', async () => {
    const response = createProblemResponse({
      type: `${BASE_URI}/thing`,
      title: 'Thing Failed',
      status: 418,
      detail: 'The thing failed',
      instance: '/thing/1'
    });

    expect(response.status).toBe(418);
    expect(response.headers.get('Content-Type')).toBe('application/problem+json');

    const body = await response.json();
    expect(body).toMatchObject({
      type: `${BASE_URI}/thing`,
      title: 'Thing Failed',
      status: 418,
      detail: 'The thing failed',
      instance: '/thing/1'
    });
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.traceId).toBe('string');
  });

  it('merges extra headers without overriding Content-Type', () => {
    const response = createProblemResponse(
      { type: 'x', title: 'x', status: 400, detail: 'x', instance: 'x' },
      { 'X-Custom': 'yes' }
    );
    expect(response.headers.get('X-Custom')).toBe('yes');
    expect(response.headers.get('Content-Type')).toBe('application/problem+json');
  });

  it('generates a distinct traceId per call', async () => {
    const a = await createProblemResponse({
      type: 'x',
      title: 'x',
      status: 400,
      detail: 'x',
      instance: 'x'
    }).json();
    const b = await createProblemResponse({
      type: 'x',
      title: 'x',
      status: 400,
      detail: 'x',
      instance: 'x'
    }).json();
    expect(a.traceId).not.toBe(b.traceId);
  });
});

describe('createValidationErrorResponse', () => {
  it('returns a 400 with the field errors and a baseUri-namespaced type', async () => {
    const errors = [{ field: 'email', message: 'Required', code: 'required' }];
    const response = createValidationErrorResponse(BASE_URI, 'Validation failed', errors, '/signup');

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.type).toBe(`${BASE_URI}/validation-error`);
    expect(body.title).toBe('Validation Failed');
    expect(body.errors).toEqual(errors);
    expect(body.instance).toBe('/signup');
  });
});

describe('createErrorTypes', () => {
  it('namespaces every type URI under the given baseUri', () => {
    const types = createErrorTypes(BASE_URI);
    expect(types.VALIDATION_ERROR).toBe(`${BASE_URI}/validation-error`);
    expect(types.USER_NOT_FOUND).toBe(`${BASE_URI}/user-not-found`);
    expect(types.INTERNAL_SERVER_ERROR).toBe(`${BASE_URI}/internal-server-error`);
  });

  it('produces different URIs for two different base URIs', () => {
    const a = createErrorTypes('https://a.example.com/problems');
    const b = createErrorTypes('https://b.example.com/problems');
    expect(a.VALIDATION_ERROR).not.toBe(b.VALIDATION_ERROR);
  });
});

describe('createStandardErrors', () => {
  const errors = createStandardErrors(BASE_URI);

  it('emailRequired: 400 with the email-required type', async () => {
    const response = errors.emailRequired('/signup');
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.type).toBe(`${BASE_URI}/email-required`);
  });

  it('invalidEmail: includes the offending email in detail when provided', async () => {
    const response = errors.invalidEmail('/signup', 'not-an-email');
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.detail).toContain('not-an-email');
  });

  it('invalidEmail: falls back to a generic detail when no email is provided', async () => {
    const body = await errors.invalidEmail('/signup').json();
    expect(body.detail).not.toContain('undefined');
  });

  it('userNotFound: 404 and mentions the email when provided', async () => {
    const response = errors.userNotFound('/users/1', 'a@b.com');
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.detail).toContain('a@b.com');
  });

  it('challengeNotFound: 400 with the challenge-not-found type', async () => {
    const response = errors.challengeNotFound('/webauthn/verify');
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.type).toBe(`${BASE_URI}/challenge-not-found`);
  });

  it('authServiceUnavailable: 503', async () => {
    const response = errors.authServiceUnavailable('/auth');
    expect(response.status).toBe(503);
  });

  it('internalServerError: 500, hides details by default', async () => {
    const response = errors.internalServerError('/x');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.detail).not.toContain('server logs');
  });

  it('internalServerError: exposes a dev-oriented detail when isDevelopment is true', async () => {
    const body = await errors.internalServerError('/x', true).json();
    expect(body.detail).toContain('server logs');
  });

  it('unauthorized: 401 with a default detail message', async () => {
    const response = errors.unauthorized('/x');
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.detail).toBe('Authentication required');
  });

  it('unauthorized: accepts a custom detail message', async () => {
    const body = await errors.unauthorized('/x', 'Token expired').json();
    expect(body.detail).toBe('Token expired');
  });

  it('forbidden: 403 with a default detail message', async () => {
    const response = errors.forbidden('/x');
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.detail).toBe('Access denied');
  });
});
