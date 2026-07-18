/**
 * signInWithPasskey Tests - Minimal Mocking Approach
 * Tests the actual behavior without over-mocking internal implementation
 */

import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/core/stores/index.js';
import { makeSvelteCompatible } from '../../src/svelte/adapters/svelte.js';
import type { AuthConfig, SignInResponse } from '../../src/core/types/index.js';

// Only mock external dependencies that we can't test in isolation
// Mock the API client - external network calls
vi.mock('../../src/core/api/auth-api', () => ({
  // NOTE: must be a real `function`, not lambda, so `new AuthApiClient()` works
  // under Vitest 4's stricter mock-constructor semantics (arrow functions are not constructible).
  AuthApiClient: vi.fn().mockImplementation(function () {
    return {
      checkEmail: vi.fn().mockResolvedValue({ exists: false, hasPasskey: false }),
      getPasskeyChallenge: vi.fn().mockResolvedValue({ challenge: 'test', allowCredentials: [] }),
      signInWithPasskey: vi.fn().mockRejectedValue(new Error('Not implemented in test')),
      signInWithMagicLink: vi.fn().mockRejectedValue(new Error('Not implemented in test')),
      refresh_token: vi.fn().mockRejectedValue(new Error('Not implemented in test')),
      signOut: vi.fn().mockResolvedValue({ success: true })
    };
  })
}));

// Mock WebAuthn browser APIs - require real browser interaction
vi.mock('../../src/core/utils/webauthn', () => ({
  authenticateWithPasskey: vi.fn(),
  serializeCredential: vi.fn(),
  isWebAuthnSupported: vi.fn(() => true),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true)),
  isConditionalMediationSupported: vi.fn(() => true)
}));

// Mock browser environment
Object.defineProperty(globalThis, 'window', {
  value: { location: { hostname: 'localhost' } },
  writable: true
});

const mockConfig: AuthConfig = {
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  enablePasskeys: true,
  enableMagicLinks: false,
  branding: {
    companyName: 'Test Company',
    showPoweredBy: true
  }
};

describe('signInWithPasskey', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let mockApiClient: any;
  let mockWebAuthn: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Get the mocked dependencies first
    const { AuthApiClient } = await import('../../src/core/api/auth-api.js');
    const webAuthnModule = await import('../../src/core/utils/webauthn.js');

    // Create a shared mock instance that all new AuthApiClient() calls will return
    mockApiClient = {
      checkEmail: vi.fn().mockResolvedValue({ exists: false, hasPasskey: false }),
      getPasskeyChallenge: vi.fn().mockResolvedValue({ challenge: 'test', allowCredentials: [] }),
      signInWithPasskey: vi.fn().mockRejectedValue(new Error('Not implemented in test')),
      signInWithMagicLink: vi.fn().mockRejectedValue(new Error('Not implemented in test')),
      refresh_token: vi.fn().mockRejectedValue(new Error('Not implemented in test')),
      signOut: vi.fn().mockResolvedValue({ success: true })
    };

    // Make AuthApiClient constructor return our mock instance
    // NOTE: must be a real `function`, not lambda, so `new AuthApiClient()` works
    // under Vitest 4's stricter mock-constructor semantics (arrow functions are not constructible).
    (AuthApiClient as any).mockImplementation(function () {
      return mockApiClient;
    });

    mockWebAuthn = webAuthnModule;

    // Now create the auth store after mocks are set up
    authStore = makeSvelteCompatible(createAuthStore(mockConfig));
  });

  describe('Input Validation', () => {
    it('should validate email parameter is required', async () => {
      await expect(authStore.signInWithPasskey('')).rejects.toThrow();
    });

    it('should validate email format', async () => {
      await expect(authStore.signInWithPasskey('invalid-email')).rejects.toThrow();
    });
  });

  describe('Authentication Flow', () => {
    it('should handle successful passkey authentication', async () => {
      // Mock the API responses
      mockApiClient.checkEmail.mockResolvedValue({
        exists: true,
        hasPasskey: true,
        userId: 'user-123'
      });

      mockApiClient.getPasskeyChallenge.mockResolvedValue({
        challenge: 'mock-challenge',
        allowCredentials: []
      });

      mockWebAuthn.authenticateWithPasskey.mockResolvedValue({
        id: 'credential-id',
        rawId: new ArrayBuffer(8),
        response: {
          clientDataJSON: new ArrayBuffer(8),
          authenticatorData: new ArrayBuffer(8),
          signature: new ArrayBuffer(8)
        },
        type: 'public-key'
      });

      mockWebAuthn.serializeCredential.mockReturnValue({
        id: 'credential-id',
        rawId: 'base64-rawid',
        response: {
          clientDataJSON: 'base64-clientdata',
          authenticatorData: 'base64-authdata',
          signature: 'base64-signature'
        },
        type: 'public-key'
      });

      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600
      };

      mockApiClient.signInWithPasskey.mockResolvedValue(mockResponse);

      await authStore.signInWithPasskey('test@example.com');

      const state = get(authStore);
      expect(state.state).toBe('authenticated');
      expect(state.user?.email).toBe('test@example.com');
      expect(state.access_token).toBe('access-token');
    });

    it('should handle user not found', async () => {
      mockApiClient.checkEmail.mockResolvedValue({
        exists: false,
        hasPasskey: false
      });

      await expect(authStore.signInWithPasskey('nonexistent@example.com')).rejects.toThrow();
    });

    it('should handle user without passkey', async () => {
      mockApiClient.checkEmail.mockResolvedValue({
        exists: true,
        hasPasskey: false,
        userId: 'user-123'
      });

      // If the implementation allows passkey creation for users without passkeys,
      // we should mock the subsequent calls to avoid undefined responses
      mockApiClient.getPasskeyChallenge.mockResolvedValue({
        challenge: 'mock-challenge',
        allowCredentials: []
      });

      mockWebAuthn.authenticateWithPasskey.mockResolvedValue({
        id: 'credential-id',
        rawId: new ArrayBuffer(8),
        response: {},
        type: 'public-key'
      });

      mockWebAuthn.serializeCredential.mockReturnValue({
        id: 'credential-id',
        rawId: 'base64-rawid',
        response: {},
        type: 'public-key'
      });

      // Mock the response indicating successful authentication
      mockApiClient.signInWithPasskey.mockResolvedValue({
        step: 'success', // Use 'success' instead of 'passkey_created'
        message: 'Passkey created and authenticated successfully',
        user: {
          id: 'user-123',
          email: 'nopasskey@example.com',
          name: 'User Name',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600
      });

      // Should succeed (passkey creation flow)
      await authStore.signInWithPasskey('nopasskey@example.com');

      const state = get(authStore);
      expect(state.state).toBe('authenticated');
    });

    it('should handle WebAuthn authentication failure', async () => {
      mockApiClient.checkEmail.mockResolvedValue({
        exists: true,
        hasPasskey: true,
        userId: 'user-123'
      });

      mockApiClient.getPasskeyChallenge.mockResolvedValue({
        challenge: 'mock-challenge',
        allowCredentials: []
      });

      mockWebAuthn.authenticateWithPasskey.mockRejectedValue(new Error('WebAuthn failed'));

      await expect(authStore.signInWithPasskey('test@example.com')).rejects.toThrow();
    });

    it('should handle API authentication failure', async () => {
      // Setup successful WebAuthn flow
      mockApiClient.checkEmail.mockResolvedValue({
        exists: true,
        hasPasskey: true,
        userId: 'user-123'
      });

      mockApiClient.getPasskeyChallenge.mockResolvedValue({
        challenge: 'mock-challenge',
        allowCredentials: []
      });

      mockWebAuthn.authenticateWithPasskey.mockResolvedValue({
        id: 'credential-id',
        rawId: new ArrayBuffer(8),
        response: {},
        type: 'public-key'
      });

      mockWebAuthn.serializeCredential.mockReturnValue({
        id: 'credential-id',
        rawId: 'base64-rawid',
        response: {},
        type: 'public-key'
      });

      // API rejects the authentication
      mockApiClient.signInWithPasskey.mockRejectedValue(new Error('Invalid credential'));

      await expect(authStore.signInWithPasskey('test@example.com')).rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    it('should save session on successful authentication', async () => {
      // Setup successful authentication flow
      mockApiClient.checkEmail.mockResolvedValue({
        exists: true,
        hasPasskey: true,
        userId: 'user-123'
      });

      mockApiClient.getPasskeyChallenge.mockResolvedValue({
        challenge: 'mock-challenge',
        allowCredentials: []
      });

      mockWebAuthn.authenticateWithPasskey.mockResolvedValue({
        id: 'credential-id',
        rawId: new ArrayBuffer(8),
        response: {},
        type: 'public-key'
      });

      mockWebAuthn.serializeCredential.mockReturnValue({
        id: 'credential-id',
        rawId: 'base64-rawid',
        response: {},
        type: 'public-key'
      });

      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600
      };

      mockApiClient.signInWithPasskey.mockResolvedValue(mockResponse);

      await authStore.signInWithPasskey('test@example.com');

      // Verify session was saved by checking real session manager
      const { getSession } = await import('../../src/core/utils/sessionManager.js');
      const savedSession = getSession();

      expect(savedSession).toBeTruthy();
      expect(savedSession?.user.email).toBe('test@example.com');
      expect(savedSession?.tokens.accessToken).toBe('access-token');
    });
  });
});
