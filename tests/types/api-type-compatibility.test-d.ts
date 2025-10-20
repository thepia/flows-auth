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
    expectTypeOf<SignInResponse>().toHaveProperty('access_token');
    expectTypeOf<SignInResponse>().toHaveProperty('refresh_token');
    expectTypeOf<SignInResponse>().toHaveProperty('expires_in');
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

  test('SignInResponse should use expires_in (seconds)', () => {
    expectTypeOf<SignInResponse['expires_in']>().toEqualTypeOf<number | undefined>();
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

  test('SignInData should have optional authMethod field', () => {
    expectTypeOf<SignInData>().toHaveProperty('authMethod');
    expectTypeOf<SignInData['authMethod']>().toEqualTypeOf<
      'passkey' | 'password' | 'email-code' | 'magic-link' | undefined
    >();
  });

  // lastActivity removed - no longer part of SignInData (session timeout removed)

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

  test('Conversion: SignInResponse.expires_in maps to SignInData.tokens.expiresAt', () => {
    // This documents the transformation pattern
    type ResponseExpiry = SignInResponse['expires_in']; // number | undefined (seconds)
    type DataExpiry = SignInData['tokens']['expiresAt']; // number | undefined (milliseconds timestamp, optional in Partial<TokenData>)

    expectTypeOf<ResponseExpiry>().toEqualTypeOf<number | undefined>();
    expectTypeOf<DataExpiry>().toEqualTypeOf<number | undefined>();

    // Conversion: expires_in (seconds) → expiresAt (milliseconds timestamp)
    // expiresAt = Date.now() + (expires_in * 1000)
  });

  test('Conversion: SignInResponse flat tokens map to SignInData nested tokens', () => {
    // Document the structural difference
    type ResponseTokens = Pick<SignInResponse, 'access_token' | 'refresh_token' | 'expires_in'>;
    type DataTokens = SignInData['tokens'];

    // Response uses flat structure
    expectTypeOf<ResponseTokens>().toMatchTypeOf<{
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    }>();

    // Data uses nested structure with camelCase fields (Partial<TokenData> makes all optional)
    expectTypeOf<DataTokens>().toMatchTypeOf<{
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: number;
      refreshedAt?: number;
      supabaseToken?: string;
      supabaseExpiresAt?: number;
    }>();
  });
});
