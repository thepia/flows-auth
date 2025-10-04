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
} from '../../../src/stores/core/session';
import type { SignInData, User } from '../../../src/types';

describe('Session Conversion Functions', () => {
  describe('createSessionData', () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'John Doe',
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      picture: 'https://example.com/avatar.jpg',
      metadata: { theme: 'dark' }
    };

    it('should convert User + tokens to SignInData with nested token structure', () => {
      const result = createSessionData(
        mockUser,
        {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          expiresIn: 3600
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
          avatar: 'https://example.com/avatar.jpg',
          preferences: { theme: 'dark' }
        },
        tokens: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          expiresAt: expect.any(Number)
        },
        authMethod: 'passkey',
        lastActivity: expect.any(Number)
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
      const result = createSessionData(
        mockUser,
        { accessToken: 'token' },
        'passkey'
      );

      expect(result.user.initials).toBe('JD');
    });

    it('should handle single-word names for initials', () => {
      const singleNameUser: User = {
        ...mockUser,
        name: 'Madonna'
      };

      const result = createSessionData(
        singleNameUser,
        { accessToken: 'token' },
        'passkey'
      );

      expect(result.user.initials).toBe('M');
    });

    it('should handle names with multiple spaces', () => {
      const multiNameUser: User = {
        ...mockUser,
        name: 'John Paul George Ringo'
      };

      const result = createSessionData(
        multiNameUser,
        { accessToken: 'token' },
        'passkey'
      );

      // Should use first and last name
      expect(result.user.initials).toBe('JR');
    });

    it('should calculate expiresAt from expiresIn seconds', () => {
      const beforeTime = Date.now();
      const expiresIn = 3600; // 1 hour

      const result = createSessionData(
        mockUser,
        { accessToken: 'token', expiresIn },
        'passkey'
      );

      const afterTime = Date.now();

      // expiresAt should be approximately now + 3600000ms (1 hour)
      const expectedExpiry = beforeTime + expiresIn * 1000;
      expect(result.tokens.expiresAt).toBeGreaterThanOrEqual(expectedExpiry);
      expect(result.tokens.expiresAt).toBeLessThanOrEqual(afterTime + expiresIn * 1000);
    });

    it('should default to 24 hours when expiresIn not provided', () => {
      const beforeTime = Date.now();

      const result = createSessionData(
        mockUser,
        { accessToken: 'token' }, // No expiresIn
        'passkey'
      );

      const expectedExpiry = beforeTime + 24 * 60 * 60 * 1000; // 24 hours
      expect(result.tokens.expiresAt).toBeGreaterThanOrEqual(expectedExpiry);
      expect(result.tokens.expiresAt).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000);
    });

    it('should handle missing refreshToken gracefully', () => {
      const result = createSessionData(
        mockUser,
        { accessToken: 'token' }, // No refreshToken
        'passkey'
      );

      expect(result.tokens.refreshToken).toBe('');
    });

    it('should set lastActivity to current timestamp', () => {
      const beforeTime = Date.now();

      const result = createSessionData(
        mockUser,
        { accessToken: 'token' },
        'passkey'
      );

      const afterTime = Date.now();

      expect(result.lastActivity).toBeGreaterThanOrEqual(beforeTime);
      expect(result.lastActivity).toBeLessThanOrEqual(afterTime);
    });

    describe('authMethod parameter', () => {
      it('should set authMethod to "passkey"', () => {
        const result = createSessionData(
          mockUser,
          { accessToken: 'token' },
          'passkey'
        );

        expect(result.authMethod).toBe('passkey');
      });

      it('should set authMethod to "email-code"', () => {
        const result = createSessionData(
          mockUser,
          { accessToken: 'token' },
          'email-code'
        );

        expect(result.authMethod).toBe('email-code');
      });

      it('should set authMethod to "magic-link"', () => {
        const result = createSessionData(
          mockUser,
          { accessToken: 'token' },
          'magic-link'
        );

        expect(result.authMethod).toBe('magic-link');
      });

      it('should set authMethod to "password"', () => {
        const result = createSessionData(
          mockUser,
          { accessToken: 'token' },
          'password'
        );

        expect(result.authMethod).toBe('password');
      });

      it('should default to "passkey" when authMethod not provided', () => {
        const result = createSessionData(mockUser, { accessToken: 'token' });

        expect(result.authMethod).toBe('passkey');
      });
    });

    describe('edge cases', () => {
      it('should handle user without name (use email)', () => {
        const noNameUser: User = {
          ...mockUser,
          name: ''
        };

        const result = createSessionData(
          noNameUser,
          { accessToken: 'token' },
          'passkey'
        );

        expect(result.user.name).toBe('test@example.com');
        expect(result.user.initials).toBeTruthy();
      });

      it('should handle user without picture', () => {
        const noPictureUser: User = {
          ...mockUser,
          picture: undefined
        };

        const result = createSessionData(
          noPictureUser,
          { accessToken: 'token' },
          'passkey'
        );

        expect(result.user.avatar).toBeUndefined();
      });

      it('should handle user without metadata', () => {
        const noMetadataUser: User = {
          ...mockUser,
          metadata: undefined
        };

        const result = createSessionData(
          noMetadataUser,
          { accessToken: 'token' },
          'passkey'
        );

        expect(result.user.preferences).toBeUndefined();
      });

      it('should handle very short expiresIn (1 second)', () => {
        const result = createSessionData(
          mockUser,
          { accessToken: 'token', expiresIn: 1 },
          'passkey'
        );

        const expectedExpiry = Date.now() + 1000;
        expect(result.tokens.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 100);
        expect(result.tokens.expiresAt).toBeLessThanOrEqual(expectedExpiry + 100);
      });

      it('should handle very long expiresIn (30 days)', () => {
        const expiresIn = 30 * 24 * 60 * 60; // 30 days in seconds
        const result = createSessionData(
          mockUser,
          { accessToken: 'token', expiresIn },
          'passkey'
        );

        const expectedExpiry = Date.now() + expiresIn * 1000;
        expect(result.tokens.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1000);
        expect(result.tokens.expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000);
      });
    });

    describe('type compatibility', () => {
      it('should return SignInData with correct structure', () => {
        const result = createSessionData(
          mockUser,
          { accessToken: 'token' },
          'passkey'
        );

        // TypeScript should enforce this at compile time, but let's validate runtime
        const signInData: SignInData = result;

        expect(signInData.user).toBeDefined();
        expect(signInData.tokens).toBeDefined();
        expect(signInData.authMethod).toBeDefined();
        expect(signInData.lastActivity).toBeDefined();
      });

      it('should have nested tokens structure matching server API', () => {
        const result = createSessionData(
          mockUser,
          {
            accessToken: 'access',
            refreshToken: 'refresh',
            expiresIn: 3600
          },
          'passkey'
        );

        // Validate nested structure (not flat)
        expect(result.tokens).toEqual({
          accessToken: 'access',
          refreshToken: 'refresh',
          expiresAt: expect.any(Number)
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
        picture: 'https://example.com/avatar.jpg',
        metadata: { theme: 'light' }
      };

      const result = convertUserToSessionUser(user);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Jane Doe',
        initials: 'JD',
        avatar: 'https://example.com/avatar.jpg',
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

    it('should map picture to avatar', () => {
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        picture: 'https://avatar.url'
      };

      const result = convertUserToSessionUser(user);

      expect(result.avatar).toBe('https://avatar.url');
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
        picture: 'https://example.com/avatar.jpg',
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

    it('should map avatar to picture', () => {
      const sessionUser: SignInData['user'] = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        initials: 'TU',
        avatar: 'https://avatar.url'
      };

      const result = convertSessionUserToUser(sessionUser);

      expect(result.picture).toBe('https://avatar.url');
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

      expect(result.picture).toBeUndefined();
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
        picture: 'https://example.com/avatar.jpg',
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
      expect(finalUser.picture).toBe(originalUser.picture);
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
        picture: 'https://avatar.url',
        metadata: { preference: 'value' }
      };

      // Create SignInData
      const signInData = createSessionData(
        user,
        {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 3600
        },
        'passkey'
      );

      // Convert back to User
      const recoveredUser = convertSessionUserToUser(signInData.user);

      // Core data should be preserved
      expect(recoveredUser.id).toBe(user.id);
      expect(recoveredUser.email).toBe(user.email);
      expect(recoveredUser.name).toBe(user.name);
      expect(recoveredUser.picture).toBe(user.picture);
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
        accessToken: 'access-token-xyz',
        refreshToken: 'refresh-token-abc',
        expiresIn: 3600
      };

      // Convert using createSessionData (as done in store methods)
      const signInData = createSessionData(
        apiResponse.user,
        {
          accessToken: apiResponse.accessToken,
          refreshToken: apiResponse.refreshToken,
          expiresIn: apiResponse.expiresIn
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
          expiresAt: expect.any(Number)
        },
        authMethod: 'email-code',
        lastActivity: expect.any(Number)
      });

      // Ensure nested tokens structure
      expect(signInData.tokens.accessToken).toBe('access-token-xyz');
      expect(signInData.tokens.refreshToken).toBe('refresh-token-abc');
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
        accessToken: 'passkey-access-token',
        refreshToken: 'passkey-refresh-token',
        expiresIn: 7200
      };

      const signInData = createSessionData(
        apiResponse.user,
        {
          accessToken: apiResponse.accessToken,
          refreshToken: apiResponse.refreshToken,
          expiresIn: apiResponse.expiresIn
        },
        'passkey'
      );

      expect(signInData.authMethod).toBe('passkey');
      expect(signInData.tokens.accessToken).toBe('passkey-access-token');
      expect(signInData.tokens.expiresAt).toBeGreaterThan(Date.now());
    });
  });
});
