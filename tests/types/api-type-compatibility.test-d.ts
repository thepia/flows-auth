/**
 * API Type Compatibility Tests
 *
 * ✅ PRODUCTION: Type-only tests for flows-auth internal type consistency.
 *
 * This validates the actual types used in production:
 * - SignInResponse: API response from server (flat tokens)
 * - SignInData: Client-side session storage (nested tokens)
 * - User: Shared user structure
 *
 * These are compile-time-only checks using Vitest's type testing.
 * Run with: pnpm test --typecheck
 */

import { describe, expectTypeOf, test } from 'vitest';
import type { SignInData, SignInResponse, User } from '../../src/types';

describe('Type Compatibility Tests', () => {
  test('SignInResponse should have flat token structure', () => {
    expectTypeOf<SignInResponse>().toHaveProperty('accessToken');
    expectTypeOf<SignInResponse>().toHaveProperty('refreshToken');
    expectTypeOf<SignInResponse>().toHaveProperty('expiresIn');
    expectTypeOf<SignInResponse>().not.toHaveProperty('tokens');
  });

  test('SignInData should have nested tokens structure', () => {
    expectTypeOf<SignInData>().toHaveProperty('tokens');
    expectTypeOf<SignInData['tokens']>().toHaveProperty('accessToken');
    expectTypeOf<SignInData['tokens']>().toHaveProperty('refreshToken');
    expectTypeOf<SignInData['tokens']>().toHaveProperty('expiresAt');
  });

  test('SignInData tokens should use expiresAt (timestamp)', () => {
    expectTypeOf<SignInData['tokens']['expiresAt']>().toEqualTypeOf<number>();
  });

  test('SignInResponse should use expiresIn (seconds)', () => {
    expectTypeOf<SignInResponse['expiresIn']>().toEqualTypeOf<number | undefined>();
  });

  test('SignInData user should have initials field', () => {
    expectTypeOf<SignInData['user']>().toHaveProperty('initials');
    expectTypeOf<SignInData['user']['initials']>().toEqualTypeOf<string>();
  });

  test('SignInData user should have required fields', () => {
    expectTypeOf<SignInData['user']>().toMatchTypeOf<{
      id: string;
      email: string;
      name: string;
      initials: string;
    }>();
  });

  test('SignInData should have authMethod field', () => {
    expectTypeOf<SignInData>().toHaveProperty('authMethod');
    expectTypeOf<SignInData['authMethod']>().toEqualTypeOf<
      'passkey' | 'password' | 'email-code' | 'magic-link'
    >();
  });

  test('SignInData should have lastActivity timestamp', () => {
    expectTypeOf<SignInData>().toHaveProperty('lastActivity');
    expectTypeOf<SignInData['lastActivity']>().toEqualTypeOf<number>();
  });

  test('User should have required core fields', () => {
    expectTypeOf<User>().toMatchTypeOf<{
      id: string;
      email: string;
      emailVerified: boolean;
      createdAt: string;
    }>();
  });

  test('User should have optional name field', () => {
    expectTypeOf<User>().toHaveProperty('name');
    expectTypeOf<User['name']>().toEqualTypeOf<string | undefined>();
  });

  test('SignInResponse should have optional user', () => {
    expectTypeOf<SignInResponse['user']>().toEqualTypeOf<User | undefined>();
  });

  test('SignInResponse should have required step field', () => {
    expectTypeOf<SignInResponse>().toHaveProperty('step');
    // SignInStep type is defined as a union
    expectTypeOf<SignInResponse['step']>().not.toEqualTypeOf<string>();
  });

  test('Conversion: SignInResponse.expiresIn maps to SignInData.tokens.expiresAt', () => {
    // This documents the transformation pattern
    type ResponseExpiry = SignInResponse['expiresIn']; // number | undefined (seconds)
    type DataExpiry = SignInData['tokens']['expiresAt']; // number (milliseconds timestamp)

    expectTypeOf<ResponseExpiry>().toEqualTypeOf<number | undefined>();
    expectTypeOf<DataExpiry>().toEqualTypeOf<number>();

    // Conversion: expiresIn (seconds) → expiresAt (milliseconds timestamp)
    // expiresAt = Date.now() + (expiresIn * 1000)
  });

  test('Conversion: SignInResponse flat tokens map to SignInData nested tokens', () => {
    // Document the structural difference
    type ResponseTokens = Pick<SignInResponse, 'accessToken' | 'refreshToken' | 'expiresIn'>;
    type DataTokens = SignInData['tokens'];

    // Response uses flat structure
    expectTypeOf<ResponseTokens>().toMatchTypeOf<{
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
    }>();

    // Data uses nested structure
    expectTypeOf<DataTokens>().toMatchTypeOf<{
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    }>();
  });
});
