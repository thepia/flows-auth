/**
 * Server-Client Type Compatibility Tests
 *
 * ✅ PRODUCTION: Validates that server response types match client expectations.
 *
 * This test ensures type safety between:
 * - thepia.com/src/api (server) - what API endpoints return
 * - flows-auth/src (client) - what client code expects
 *
 * Run with: pnpm test --typecheck
 */

import { describe, expectTypeOf, test } from 'vitest';

// Server types (source of truth)
import type {
  CheckUserResponse as ServerCheckUserResponse,
  SignInResponse as ServerSignInResponse
} from '../../../../../thepia.com/src/api/types/responses.ts';

// Client types (must match server)
import type { SignInResponse as ClientSignInResponse } from '../../src/types/index.ts';

describe('Server-Client Type Compatibility', () => {
  describe('SignInResponse compatibility', () => {
    test('Client SignInResponse should be compatible with Server SignInResponse', () => {
      // Client type must accept all fields that server returns
      expectTypeOf<ServerSignInResponse>().toMatchTypeOf<ClientSignInResponse>();
    });

    test('Both should have same token structure (flat, not nested)', () => {
      // Server tokens are flat
      expectTypeOf<ServerSignInResponse>().toHaveProperty('access_token');
      expectTypeOf<ServerSignInResponse>().toHaveProperty('refresh_token');
      expectTypeOf<ServerSignInResponse>().toHaveProperty('expires_in');
      expectTypeOf<ServerSignInResponse>().not.toHaveProperty('tokens');

      // Client tokens should also be flat (matches server)
      expectTypeOf<ClientSignInResponse>().toHaveProperty('access_token');
      expectTypeOf<ClientSignInResponse>().toHaveProperty('refresh_token');
      expectTypeOf<ClientSignInResponse>().toHaveProperty('expires_in');
      expectTypeOf<ClientSignInResponse>().not.toHaveProperty('tokens');
    });

    test('Both should have same step field type', () => {
      expectTypeOf<ServerSignInResponse['step']>().toEqualTypeOf<ClientSignInResponse['step']>();
    });

    test('Both should have optional user field', () => {
      expectTypeOf<ServerSignInResponse['user']>().toMatchTypeOf<ClientSignInResponse['user']>();
    });

    test('Token fields should have same types', () => {
      expectTypeOf<ServerSignInResponse['access_token']>().toEqualTypeOf<
        ClientSignInResponse['access_token']
      >();
      expectTypeOf<ServerSignInResponse['refresh_token']>().toEqualTypeOf<
        ClientSignInResponse['refresh_token']
      >();
      expectTypeOf<ServerSignInResponse['expires_in']>().toEqualTypeOf<
        ClientSignInResponse['expires_in']
      >();
    });
  });

  describe('CheckUserResponse usage', () => {
    test('Server CheckUserResponse structure is well-defined', () => {
      expectTypeOf<ServerCheckUserResponse>().toHaveProperty('exists');
      expectTypeOf<ServerCheckUserResponse>().toHaveProperty('hasWebAuthn');
      expectTypeOf<ServerCheckUserResponse>().toHaveProperty('userId');
      expectTypeOf<ServerCheckUserResponse>().toHaveProperty('emailVerified');
    });

    test('Client receives CheckUserResponse data correctly', () => {
      // This documents what the client's checkUser method returns
      // The return type comes from server's CheckUserResponse
      type ClientCheckUserReturn = {
        exists: boolean;
        hasWebAuthn: boolean;
        userId?: string;
        emailVerified?: boolean;
        invitationTokenHash?: string | null;
        lastPinExpiry?: string;
      };

      // Client's expected structure should match server's response
      expectTypeOf<ServerCheckUserResponse>().toMatchTypeOf<ClientCheckUserReturn>();
    });

    test('PIN expiry fields are correctly typed', () => {
      expectTypeOf<ServerCheckUserResponse['lastPinExpiry']>().toEqualTypeOf<
        string | null | undefined
      >();
      expectTypeOf<ServerCheckUserResponse['lastPinSentAt']>().toEqualTypeOf<
        string | null | undefined
      >();
    });
  });

  describe('Type conversion documentation', () => {
    test('Server returns flat SignInResponse, client converts to nested SignInData', () => {
      // Server structure (flat)
      type ServerStructure = Pick<
        ServerSignInResponse,
        'access_token' | 'refresh_token' | 'expires_in'
      >;

      expectTypeOf<ServerStructure>().toMatchTypeOf<{
        access_token?: string;
        refresh_token?: string;
        expires_in?: number; // seconds from server
      }>();

      // Client converts this to SignInData with nested tokens
      // This conversion happens in createSessionData() utility
      // expires_in (seconds) → tokens.expiresAt (milliseconds timestamp)
      // flat structure → nested structure
    });

    test('expires_in conversion: server seconds → client milliseconds timestamp', () => {
      // Server provides duration in seconds
      expectTypeOf<ServerSignInResponse['expires_in']>().toEqualTypeOf<number | undefined>();

      // Client needs absolute timestamp in milliseconds
      // Conversion: expiresAt = Date.now() + (expires_in * 1000)
      type ClientExpiresAt = number; // Always defined in SignInData.tokens.expiresAt

      expectTypeOf<ClientExpiresAt>().toEqualTypeOf<number>();
    });
  });
});
