import { get } from 'svelte/store';
/**
 * Tests for createAccount function without WebAuthn
 * Ensures basic account creation works without passkey requirements
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore, makeSvelteCompatible } from '../../src/stores';
import type { AuthConfig, SignInResponse } from '../../src/types';

// Mock WebAuthn utilities
vi.mock('../../src/utils/webauthn', () => ({
  authenticateWithPasskey: vi.fn(),
  serializeCredential: vi.fn(),
  isWebAuthnSupported: vi.fn(() => false),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false))
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
  enablePasskeys: false,
  enableMagicLinks: true,
  appCode: 'test-app',
  signInMode: 'login-or-register',
  invitationToken: 'test-invitation-token'
};

describe('Auth Store - createAccount (without WebAuthn)', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let mockApiClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Create mock API client
    mockApiClient = {
      registerUser: vi.fn(),
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithPasskey: vi.fn(),
      refresh_token: vi.fn(),
      signOut: vi.fn(),
      checkEmail: vi.fn(),
      sendAppEmailCode: vi.fn(),
      verifyAppEmailCode: vi.fn()
    };

    authStore = makeSvelteCompatible(createAuthStore(mockConfig, mockApiClient));
  });

  describe('Successful account creation', () => {
    it('should create account with basic user information', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'newuser@example.com',
          name: 'John Doe',
          emailVerified: false,
          createdAt: '2023-01-01T00:00:00Z'
        }
      };

      mockApiClient.registerUser.mockResolvedValue(mockResponse);

      const userData = {
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        acceptedTerms: false,
        acceptedPrivacy: false,
        invitationToken: 'test-invitation-token'
      };

      const result = await authStore.createAccount(userData);

      expect(mockApiClient.registerUser).toHaveBeenCalledWith(userData);
      expect(result).toEqual(mockResponse);
      expect(result.step).toBe('success');
      expect(result.user?.email).toBe('newuser@example.com');
    });

    it('should create account without firstName/lastName', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '456',
          email: 'user@example.com',
          name: '',
          emailVerified: false,
          createdAt: '2023-01-01T00:00:00Z'
        }
      };

      mockApiClient.registerUser.mockResolvedValue(mockResponse);

      const userData = {
        email: 'user@example.com',
        acceptedTerms: true,
        acceptedPrivacy: true
      };

      const result = await authStore.createAccount(userData);

      expect(mockApiClient.registerUser).toHaveBeenCalledWith(userData);
      expect(result.step).toBe('success');
      expect(result.user?.email).toBe('user@example.com');
    });

    it('should create account with invitation token', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '789',
          email: 'invited@example.com',
          name: 'Jane Smith',
          emailVerified: false,
          createdAt: '2023-01-01T00:00:00Z'
        }
      };

      mockApiClient.registerUser.mockResolvedValue(mockResponse);

      const userData = {
        email: 'invited@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        acceptedTerms: true,
        acceptedPrivacy: true,
        invitationToken: 'special-invite-123'
      };

      const result = await authStore.createAccount(userData);

      expect(mockApiClient.registerUser).toHaveBeenCalledWith(userData);
      expect(result.user?.email).toBe('invited@example.com');
      expect(result.step).toBe('success');
    });
  });

  describe('Error handling', () => {
    it('should handle account creation failure', async () => {
      const mockError = new Error('Email already exists');
      (mockError as any).code = 'email_exists';

      mockApiClient.registerUser.mockRejectedValue(mockError);

      const userData = {
        email: 'existing@example.com',
        firstName: 'Test',
        lastName: 'User',
        acceptedTerms: true,
        acceptedPrivacy: true
      };

      await expect(authStore.createAccount(userData)).rejects.toThrow('Email already exists');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed');
      mockApiClient.registerUser.mockRejectedValue(networkError);

      const userData = {
        email: 'test@example.com',
        acceptedTerms: true,
        acceptedPrivacy: true
      };

      await expect(authStore.createAccount(userData)).rejects.toThrow('Network request failed');
    });

    it('should handle API response without user', async () => {
      const mockResponse: SignInResponse = {
        step: 'error'
      };

      mockApiClient.registerUser.mockResolvedValue(mockResponse);

      const userData = {
        email: 'test@example.com',
        acceptedTerms: true,
        acceptedPrivacy: true
      };

      // createAccount now returns the response even if step is 'error'
      // The calling code is responsible for checking the step
      const result = await authStore.createAccount(userData);
      expect(result.step).toBe('error');
      expect(result.user).toBeUndefined();
    });
  });

  describe('Event emission', () => {
    it('should emit registration_started event', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: false,
          createdAt: '2023-01-01T00:00:00Z'
        }
      };

      mockApiClient.registerUser.mockResolvedValue(mockResponse);

      const registrationStartedHandler = vi.fn();
      authStore.on('registration_started', registrationStartedHandler);

      const userData = {
        email: 'test@example.com',
        acceptedTerms: true,
        acceptedPrivacy: true
      };

      await authStore.createAccount(userData);

      expect(registrationStartedHandler).toHaveBeenCalledWith({
        email: 'test@example.com',
        method: 'email-code'
      });
    });

    it('should emit registration_error event on failure', async () => {
      const mockError = new Error('Registration failed');
      (mockError as any).code = 'registration_failed';

      mockApiClient.registerUser.mockRejectedValue(mockError);

      const registrationErrorHandler = vi.fn();
      authStore.on('registration_error', registrationErrorHandler);

      const userData = {
        email: 'test@example.com',
        acceptedTerms: true,
        acceptedPrivacy: true
      };

      await expect(authStore.createAccount(userData)).rejects.toThrow();

      expect(registrationErrorHandler).toHaveBeenCalledWith({
        error: {
          code: 'registration_failed',
          message: 'Registration failed'
        }
      });
    });
  });

  describe('State management', () => {
    it('should not set error state on successful account creation', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: false,
          createdAt: '2023-01-01T00:00:00Z'
        }
      };

      mockApiClient.registerUser.mockResolvedValue(mockResponse);

      const userData = {
        email: 'test@example.com',
        acceptedTerms: true,
        acceptedPrivacy: true
      };

      await authStore.createAccount(userData);

      // Should not set error state or authenticate user automatically
      const finalState = get(authStore);
      expect(finalState.error).toBeUndefined();
      expect(finalState.state).toBe('unauthenticated'); // Should not authenticate user
    });

    it('should not authenticate user after account creation', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: false,
          createdAt: '2023-01-01T00:00:00Z'
        }
      };

      mockApiClient.registerUser.mockResolvedValue(mockResponse);

      const userData = {
        email: 'test@example.com',
        acceptedTerms: true,
        acceptedPrivacy: true
      };

      await authStore.createAccount(userData);

      const state = get(authStore);
      expect(state.state).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.access_token).toBeNull();
    });
  });
});
