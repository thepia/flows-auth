/**
 * Tests for createAccount function without WebAuthn
 * Ensures basic account creation works without passkey requirements
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig, SignInResponse } from '../../src/types';

// Mock the API client
vi.mock('../../src/api/auth-api', () => ({
  AuthApiClient: vi.fn().mockImplementation(() => ({
    registerUser: vi.fn(),
    signIn: vi.fn(),
    signInWithMagicLink: vi.fn(),
    signInWithPasskey: vi.fn(),
    refreshToken: vi.fn(),
    signOut: vi.fn(),
    checkEmail: vi.fn(),
    sendAppEmailCode: vi.fn(),
    verifyAppEmailCode: vi.fn()
  }))
}));

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
    
    // Get the mocked API client constructor
    const { AuthApiClient } = await import('../../src/api/auth-api');
    const MockedAuthApiClient = AuthApiClient as any;
    
    authStore = createAuthStore(mockConfig);
    
    // Get the mocked API client instance
    mockApiClient = MockedAuthApiClient.mock.results[MockedAuthApiClient.mock.results.length - 1].value;
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

      const state = get(authStore);
      expect(state.state).toBe('error');
      expect(state.error?.code).toBe('email_exists');
      expect(state.error?.message).toBe('Email already exists');
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

      const state = get(authStore);
      expect(state.state).toBe('error');
      expect(state.error?.code).toBe('account_creation_failed');
    });

    it('should handle API response without user', async () => {
      const mockResponse: SignInResponse = {
        step: 'error',
        message: 'Invalid request'
      };

      mockApiClient.registerUser.mockResolvedValue(mockResponse);

      const userData = {
        email: 'test@example.com',
        acceptedTerms: true,
        acceptedPrivacy: true
      };

      await expect(authStore.createAccount(userData)).rejects.toThrow('Failed to create user account');
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

      expect(registrationStartedHandler).toHaveBeenCalledWith({ email: 'test@example.com' });
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
    it('should clear errors before account creation', async () => {
      // Set an existing error state
      const state = get(authStore);
      authStore['updateState']({ error: { code: 'previous_error', message: 'Previous error' } });
      
      expect(get(authStore).error).toBeTruthy();

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

      // Error should be cleared, but user should not be automatically authenticated
      const finalState = get(authStore);
      expect(finalState.error).toBeNull();
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
      expect(state.accessToken).toBeNull();
    });
  });
});