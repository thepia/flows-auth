/**
 * signInWithPasskey Tests - Minimal Mocking Approach
 * Tests the actual behavior without over-mocking internal implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig, SignInResponse } from '../../src/types';

// Only mock external dependencies that we can't test in isolation
// Mock the API client - external network calls
vi.mock('../../src/api/auth-api', () => ({
  AuthApiClient: vi.fn().mockImplementation(() => ({
    checkEmail: vi.fn(),
    getPasskeyChallenge: vi.fn(), 
    signInWithPasskey: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithMagicLink: vi.fn(),
    refreshToken: vi.fn(),
    signOut: vi.fn()
  }))
}));

// Mock WebAuthn browser APIs - require real browser interaction
vi.mock('../../src/utils/webauthn', () => ({
  authenticateWithPasskey: vi.fn(),
  serializeCredential: vi.fn(),
  isWebAuthnSupported: vi.fn(() => true),
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
  enableMagicLinks: true,
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
    
    authStore = createAuthStore(mockConfig);
    
    // Get the mocked dependencies
    const { AuthApiClient } = await import('../../src/api/auth-api');
    mockApiClient = (AuthApiClient as any).mock.results[0].value;
    
    const webAuthnModule = await import('../../src/utils/webauthn');
    mockWebAuthn = webAuthnModule;
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
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600
      };

      mockApiClient.signInWithPasskey.mockResolvedValue(mockResponse);

      await authStore.signInWithPasskey('test@example.com');

      const state = get(authStore);
      expect(state.state).toBe('authenticated');
      expect(state.user?.email).toBe('test@example.com');
      expect(state.accessToken).toBe('access-token');
    });

    it('should handle user not found', async () => {
      mockApiClient.checkEmail.mockResolvedValue({
        exists: false,
        hasPasskey: false
      });

      await expect(authStore.signInWithPasskey('nonexistent@example.com'))
        .rejects.toThrow();
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
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600
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

      await expect(authStore.signInWithPasskey('test@example.com'))
        .rejects.toThrow();
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

      await expect(authStore.signInWithPasskey('test@example.com'))
        .rejects.toThrow();
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
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600
      };

      mockApiClient.signInWithPasskey.mockResolvedValue(mockResponse);

      await authStore.signInWithPasskey('test@example.com');

      // Verify session was saved by checking real session manager
      const { getSession } = await import('../../src/utils/sessionManager');
      const savedSession = getSession();
      
      expect(savedSession).toBeTruthy();
      expect(savedSession?.user.email).toBe('test@example.com');
      expect(savedSession?.tokens.accessToken).toBe('access-token');
    });
  });
});