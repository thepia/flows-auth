/**
 * Unit Tests for Session Conversion Functions
 *
 * Tests the critical SignInResponse → SignInData conversion layer that happens
 * at the store method boundary. These tests ensure the conversion logic is correct
 * and maintains the proper type boundaries.
 */

import { describe, expect, it } from 'vitest';
import {
  convertSessionUserToUser,
  convertUserToSessionUser,
  createSessionData
} from '../../../src/core/stores/core/session.js';
import type { SignInData, User } from '../../../src/core/types/index.js';

describe('Session Conversion Functions', () => {
  describe('createSessionData', () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'John Doe',
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      metadata: { theme: 'dark' }
    };

    it('should convert User + tokens to SignInData with nested token structure', () => {
      const result = createSessionData(
        mockUser,
        {
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-456',
          expires_in: 3600
        },
        'passkey'
      );

      // Validate structure
      expect(result).toMatchObject({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'John Doe',
          initials: expect.any(String),
          preferences: { theme: 'dark' }
        },
        tokens: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          expiresAt: expect.any(String) // ISO string now
        },
        authMethod: 'passkey'
      });

      // Validate nested tokens structure (not flat)
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(result.tokens).toHaveProperty('expiresAt');

      // Validate no flat token fields at root level
      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should generate initials from user name', () => {
      const result = createSessionData(mockUser, { access_token: 'token' }, 'passkey');

      expect(result.user.initials).toBe('JD');
    });

    it('should handle single-word names for initials', () => {
      const singleNameUser: User = {
        ...mockUser,
        name: 'Madonna'
      };

      const result = createSessionData(singleNameUser, { access_token: 'token' }, 'passkey');

      expect(result.user.initials).toBe('M');
    });

    it('should handle names with multiple spaces', () => {
      const multiNameUser: User = {
        ...mockUser,
        name: 'John Paul George Ringo'
      };

      const result = createSessionData(multiNameUser, { access_token: 'token' }, 'passkey');

      // Should use first and last name
      expect(result.user.initials).toBe('JR');
    });

    it('should calculate expiresAt from expires_in seconds', () => {
      const beforeTime = Date.now();
      const expires_in = 3600; // 1 hour

      const result = createSessionData(mockUser, { access_token: 'token', expires_in }, 'passkey');

      const afterTime = Date.now();

      // expiresAt is now an ISO string, parse it to compare
      const expiresAtMs = new Date(result.tokens.expiresAt as string).getTime();
      const expectedExpiry = beforeTime + expires_in * 1000;
      expect(expiresAtMs).toBeGreaterThanOrEqual(expectedExpiry);
      expect(expiresAtMs).toBeLessThanOrEqual(afterTime + expires_in * 1000);
    });

    it('should default to 24 hours when expires_in not provided', () => {
      const beforeTime = Date.now();

      const result = createSessionData(
        mockUser,
        { access_token: 'token' }, // No expires_in
        'passkey'
      );

      // expiresAt is now an ISO string, parse it to compare
      const expiresAtMs = new Date(result.tokens.expiresAt as string).getTime();
      const expectedExpiry = beforeTime + 24 * 60 * 60 * 1000; // 24 hours
      expect(expiresAtMs).toBeGreaterThanOrEqual(expectedExpiry);
      expect(expiresAtMs).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000);
    });

    it('should handle missing refresh_token gracefully', () => {
      const result = createSessionData(
        mockUser,
        { access_token: 'token' }, // No refresh_token
        'passkey'
      );

      expect(result.tokens.refreshToken).toBe('');
    });

    describe('authMethod parameter', () => {
      it('should set authMethod to "passkey"', () => {
        const result = createSessionData(mockUser, { access_token: 'token' }, 'passkey');

        expect(result.authMethod).toBe('passkey');
      });

      it('should set authMethod to "email-code"', () => {
        const result = createSessionData(mockUser, { access_token: 'token' }, 'email-code');

        expect(result.authMethod).toBe('email-code');
      });

      it('should set authMethod to "password"', () => {
        const result = createSessionData(mockUser, { access_token: 'token' }, 'password');

        expect(result.authMethod).toBe('password');
      });

      it('should default to "passkey" when authMethod not provided', () => {
        const result = createSessionData(mockUser, { access_token: 'token' });

        expect(result.authMethod).toBe('passkey');
      });
    });

    describe('edge cases', () => {
      it('should handle user without name (use email)', () => {
        const noNameUser: User = {
          ...mockUser,
          name: ''
        };

        const result = createSessionData(noNameUser, { access_token: 'token' }, 'passkey');

        expect(result.user.name).toBe('test@example.com');
        expect(result.user.initials).toBeTruthy();
      });

      it('should handle user without metadata', () => {
        const noMetadataUser: User = {
          ...mockUser,
          metadata: undefined
        };

        const result = createSessionData(noMetadataUser, { access_token: 'token' }, 'passkey');

        expect(result.user.preferences).toBeUndefined();
      });

      it('should handle very short expires_in (1 second)', () => {
        const result = createSessionData(
          mockUser,
          { access_token: 'token', expires_in: 1 },
          'passkey'
        );

        // expiresAt is now an ISO string, parse it to compare
        const expiresAtMs = new Date(result.tokens.expiresAt as string).getTime();
        const expectedExpiry = Date.now() + 1000;
        expect(expiresAtMs).toBeGreaterThanOrEqual(expectedExpiry - 100);
        expect(expiresAtMs).toBeLessThanOrEqual(expectedExpiry + 100);
      });

      it('should handle very long expires_in (30 days)', () => {
        const expires_in = 30 * 24 * 60 * 60; // 30 days in seconds
        const result = createSessionData(
          mockUser,
          { access_token: 'token', expires_in },
          'passkey'
        );

        // expiresAt is now an ISO string, parse it to compare
        const expiresAtMs = new Date(result.tokens.expiresAt as string).getTime();
        const expectedExpiry = Date.now() + expires_in * 1000;
        expect(expiresAtMs).toBeGreaterThanOrEqual(expectedExpiry - 1000);
        expect(expiresAtMs).toBeLessThanOrEqual(expectedExpiry + 1000);
      });
    });

    describe('type compatibility', () => {
      it('should return SignInData with correct structure', () => {
        const result = createSessionData(mockUser, { access_token: 'token' }, 'passkey');

        // TypeScript should enforce this at compile time, but let's validate runtime
        const signInData: SignInData = result;

        expect(signInData.user).toBeDefined();
        expect(signInData.tokens).toBeDefined();
        expect(signInData.authMethod).toBeDefined();
      });

      it('should have nested tokens structure matching server API', () => {
        const result = createSessionData(
          mockUser,
          {
            access_token: 'access',
            refresh_token: 'refresh',
            expires_in: 3600
          },
          'passkey'
        );

        // Validate nested structure (not flat)
        expect(result.tokens).toEqual({
          accessToken: 'access',
          refreshToken: 'refresh',
          refreshedAt: expect.any(String), // ISO string now
          expiresAt: expect.any(String), // ISO string now
          supabaseToken: undefined,
          supabaseExpiresAt: undefined
        });
      });
    });
  });

  describe('convertUserToSessionUser', () => {
    it('should convert User to SignInData.user format', () => {
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Jane Doe',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        metadata: { theme: 'light' }
      };

      const result = convertUserToSessionUser(user);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Jane Doe',
        initials: 'JD',
        preferences: { theme: 'light' }
      });
    });

    it('should use email as name fallback', () => {
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: '',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z'
      };

      const result = convertUserToSessionUser(user);

      expect(result.name).toBe('test@example.com');
    });

    it('should generate initials from name', () => {
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Alice Bob',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z'
      };

      const result = convertUserToSessionUser(user);

      expect(result.initials).toBe('AB');
    });

    it('should handle missing optional fields', () => {
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z'
      };

      const result = convertUserToSessionUser(user);

      expect(result.preferences).toBeUndefined();
    });

    it('should map metadata to preferences', () => {
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        metadata: { setting1: 'value1', setting2: 'value2' }
      };

      const result = convertUserToSessionUser(user);

      expect(result.preferences).toEqual({ setting1: 'value1', setting2: 'value2' });
    });
  });

  describe('convertSessionUserToUser', () => {
    it('should convert SignInData.user to User format', () => {
      const sessionUser: SignInData['user'] = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'John Smith',
        initials: 'JS',
        avatar: 'https://example.com/avatar.jpg',
        preferences: { theme: 'dark' }
      };

      const result = convertSessionUserToUser(sessionUser);

      expect(result).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        name: 'John Smith',
        emailVerified: true,
        createdAt: expect.any(String),
        metadata: { theme: 'dark' }
      });
    });

    it('should assume emailVerified is true for session users', () => {
      const sessionUser: SignInData['user'] = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        initials: 'TU'
      };

      const result = convertSessionUserToUser(sessionUser);

      expect(result.emailVerified).toBe(true);
    });

    it('should provide fallback createdAt timestamp', () => {
      const sessionUser: SignInData['user'] = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        initials: 'TU'
      };

      const result = convertSessionUserToUser(sessionUser);

      expect(result.createdAt).toBeTruthy();
      expect(typeof result.createdAt).toBe('string');
      // Should be valid ISO 8601 format
      expect(() => new Date(result.createdAt)).not.toThrow();
    });

    it('should map preferences to metadata', () => {
      const sessionUser: SignInData['user'] = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        initials: 'TU',
        preferences: { key1: 'value1', key2: 'value2' }
      };

      const result = convertSessionUserToUser(sessionUser);

      expect(result.metadata).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should handle missing optional fields', () => {
      const sessionUser: SignInData['user'] = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        initials: 'TU'
      };

      const result = convertSessionUserToUser(sessionUser);

      expect(result.metadata).toBeUndefined();
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data integrity through User → SessionUser → User', () => {
      const originalUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        metadata: { theme: 'dark' }
      };

      // Convert User → SessionUser
      const sessionUser = convertUserToSessionUser(originalUser);

      // Convert SessionUser → User
      const finalUser = convertSessionUserToUser(sessionUser);

      // Validate core fields maintained
      expect(finalUser.id).toBe(originalUser.id);
      expect(finalUser.email).toBe(originalUser.email);
      expect(finalUser.name).toBe(originalUser.name);
      expect(finalUser.metadata).toEqual(originalUser.metadata);

      // Note: createdAt and emailVerified will differ (fallback values used)
      expect(finalUser.emailVerified).toBe(true);
      expect(finalUser.createdAt).toBeTruthy();
    });

    it('should maintain data through full SignInData creation cycle', () => {
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Alice Smith',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        metadata: { preference: 'value' }
      };

      // Create SignInData
      const signInData = createSessionData(
        user,
        {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600
        },
        'passkey'
      );

      // Convert back to User
      const recoveredUser = convertSessionUserToUser(signInData.user);

      // Core data should be preserved
      expect(recoveredUser.id).toBe(user.id);
      expect(recoveredUser.email).toBe(user.email);
      expect(recoveredUser.name).toBe(user.name);
      expect(recoveredUser.metadata).toEqual(user.metadata);
    });
  });

  describe('integration with actual SignInResponse conversion', () => {
    it('should correctly convert a typical API SignInResponse to SignInData', () => {
      // Simulate what comes back from API
      const apiResponse = {
        step: 'success' as const,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00Z'
        },
        access_token: 'access-token-xyz',
        refresh_token: 'refresh-token-abc',
        expires_in: 3600
      };

      // Convert using createSessionData (as done in store methods)
      const signInData = createSessionData(
        apiResponse.user,
        {
          access_token: apiResponse.access_token,
          refresh_token: apiResponse.refresh_token,
          expires_in: apiResponse.expires_in
        },
        'email-code'
      );

      // Validate result is proper SignInData
      expect(signInData).toMatchObject({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU'
        },
        tokens: {
          accessToken: 'access-token-xyz',
          refreshToken: 'refresh-token-abc',
          expiresAt: expect.any(String) // ISO string now
        },
        authMethod: 'email-code'
      });

      // Ensure nested tokens structure
      expect(signInData.tokens.accessToken).toBe('access-token-xyz');
      expect(signInData.tokens.refreshToken).toBe('refresh-token-abc');

      // Verify expiresAt is a valid ISO string in the future
      const expiresAtMs = new Date(signInData.tokens.expiresAt as string).getTime();
      expect(expiresAtMs).toBeGreaterThan(Date.now());
    });

    it('should handle passkey authentication response', () => {
      const apiResponse = {
        step: 'success' as const,
        user: {
          id: 'user-456',
          email: 'passkey@example.com',
          name: 'Passkey User',
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00Z'
        },
        access_token: 'passkey-access-token',
        refresh_token: 'passkey-refresh-token',
        expires_in: 7200
      };

      const signInData = createSessionData(
        apiResponse.user,
        {
          access_token: apiResponse.access_token,
          refresh_token: apiResponse.refresh_token,
          expires_in: apiResponse.expires_in
        },
        'passkey'
      );

      expect(signInData.authMethod).toBe('passkey');
      expect(signInData.tokens.accessToken).toBe('passkey-access-token');

      // expiresAt is now an ISO string, parse it to compare
      const expiresAtMs = new Date(signInData.tokens.expiresAt as string).getTime();
      expect(expiresAtMs).toBeGreaterThan(Date.now());
    });
  });
});
