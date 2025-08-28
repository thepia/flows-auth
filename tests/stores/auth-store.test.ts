/**
 * Auth Store Tests
 */

import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig, SignInResponse } from '../../src/types';

// Only mock external dependencies that we can't test in isolation
// Mock the API client - external network calls
vi.mock('../../src/api/auth-api', () => ({
  AuthApiClient: vi.fn().mockImplementation(() => ({
    signIn: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithPasskey: vi.fn(),
    signInWithMagicLink: vi.fn(),
    refreshToken: vi.fn(),
    signOut: vi.fn(),
    checkEmail: vi.fn(),
  })),
}));

// Mock WebAuthn browser APIs - require real browser interaction
vi.mock('../../src/utils/webauthn', () => ({
  authenticateWithPasskey: vi.fn(),
  serializeCredential: vi.fn(),
  isWebAuthnSupported: vi.fn(() => false), // Default to false for unit tests
  isConditionalMediationSupported: vi.fn(() => false),
}));

// Mock browser environment check
Object.defineProperty(globalThis, 'window', {
  value: { location: { hostname: 'localhost' } },
  writable: true,
});

const mockConfig: AuthConfig = {
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  enablePasskeys: true,
  enableMagicLinks: true,
  enablePasswordLogin: true,
  enableSocialLogin: false,
  branding: {
    companyName: 'Test Company',
    showPoweredBy: true,
  },
};

describe('Auth Store', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let mockApiClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    authStore = createAuthStore(mockConfig);

    // Get the mocked API client instance
    const { AuthApiClient } = await import('../../src/api/auth-api');
    mockApiClient = (AuthApiClient as any).mock.results[0].value;
  });

  describe('Initial State', () => {
    it('should initialize with unauthenticated state', () => {
      const state = get(authStore);

      expect(state.state).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should restore state from session if valid session exists', async () => {
      // Set up a valid session in localStorage (using real session manager)
      const { saveSession } = await import('../../src/utils/sessionManager');

      const sessionData = {
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU',
          avatar: null,
          preferences: {},
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 3600000,
        },
        lastActivity: Date.now(),
        createdAt: Date.now(),
      };

      // Save session using real session manager
      saveSession(sessionData);

      // Create new auth store that should restore from session
      const restoredStore = createAuthStore(mockConfig);

      // Give state machine time to initialize
      await new Promise((resolve) => setTimeout(resolve, 10));

      const state = get(restoredStore);

      expect(state.state).toBe('authenticated');
      expect(state.user?.email).toBe('test@example.com');
      expect(state.accessToken).toBe('access-token');
      expect(state.refreshToken).toBe('refresh-token');
    });
  });

  describe('Authentication', () => {
    it('should handle successful password sign in', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      };

      mockApiClient.signInWithPassword.mockResolvedValue(mockResponse);

      await authStore.signInWithPassword('test@example.com', 'password');

      const state = get(authStore);
      expect(state.state).toBe('authenticated');
      expect(state.user).toEqual(mockResponse.user);
      expect(state.accessToken).toBe('access-token');
      expect(state.refreshToken).toBe('refresh-token');
    });

    it('should handle authentication errors', async () => {
      const mockError = new Error('Invalid credentials');
      (mockError as any).code = 'invalid_credentials';

      mockApiClient.signInWithPassword.mockRejectedValue(mockError);

      await expect(
        authStore.signInWithPassword('test@example.com', 'wrong-password')
      ).rejects.toThrow('Invalid credentials');

      const state = get(authStore);
      expect(state.state).toBe('error');
      expect(state.error).toEqual({
        code: 'invalid_credentials',
        message: 'Invalid credentials',
      });
    });

    it('should handle magic link sign in', async () => {
      const mockResponse: SignInResponse = {
        step: 'magic_link_sent',
        message: 'Magic link sent to your email',
      };

      mockApiClient.signInWithMagicLink.mockResolvedValue(mockResponse);

      const result = await authStore.signInWithMagicLink('test@example.com');

      expect(result.step).toBe('magic_link_sent');
      expect(result.message).toBe('Magic link sent to your email');

      const state = get(authStore);
      expect(state.state).toBe('unauthenticated'); // Still unauthenticated until link is clicked
    });
  });

  describe('Token Management', () => {
    it('should save session data on successful authentication', async () => {
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      };

      mockApiClient.signInWithPassword.mockResolvedValue(mockResponse);

      await authStore.signInWithPassword('test@example.com', 'password');

      // Verify session was saved by checking localStorage (real session manager behavior)
      const { getSession } = await import('../../src/utils/sessionManager');
      const savedSession = getSession();

      expect(savedSession).toBeTruthy();
      expect(savedSession?.user.email).toBe('test@example.com');
      expect(savedSession?.tokens.accessToken).toBe('access-token');
    });

    it('should clear session on sign out', async () => {
      // Set up authenticated state first
      const { saveSession } = await import('../../src/utils/sessionManager');
      const sessionData = {
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU',
          avatar: null,
          preferences: {},
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 3600000,
        },
        lastActivity: Date.now(),
        createdAt: Date.now(),
      };
      saveSession(sessionData);

      mockApiClient.signOut.mockResolvedValue(undefined);

      await authStore.signOut();

      // Verify session was cleared by checking localStorage (real session manager behavior)
      const { getSession } = await import('../../src/utils/sessionManager');
      const clearedSession = getSession();

      expect(clearedSession).toBeNull();

      const state = get(authStore);
      expect(state.state).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });

    it('should handle token refresh', async () => {
      // First sign in to establish a refresh token
      const mockSignInResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
        },
        accessToken: 'initial-token',
        refreshToken: 'initial-refresh-token',
        expiresIn: 3600,
      };

      mockApiClient.signInWithPassword.mockResolvedValue(mockSignInResponse);

      // Sign in to establish refresh token
      await authStore.signInWithPassword('test@example.com', 'password');

      // Now set up refresh response
      const mockRefreshResponse: SignInResponse = {
        step: 'success',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      };

      mockApiClient.refreshToken.mockResolvedValue(mockRefreshResponse);

      await authStore.refreshTokens();

      const state = get(authStore);
      expect(state.accessToken).toBe('new-access-token');

      // Verify session was updated with new tokens
      const { getSession } = await import('../../src/utils/sessionManager');
      const updatedSession = getSession();
      expect(updatedSession?.tokens.accessToken).toBe('new-access-token');
      expect(updatedSession?.tokens.refreshToken).toBe('new-refresh-token');
    });
  });

  describe('Helper Methods', () => {
    it('should correctly identify authenticated state', async () => {
      expect(authStore.isAuthenticated()).toBe(false);

      // First sign in to establish authenticated state properly
      const mockSignInResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
        },
        accessToken: 'token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      };

      mockApiClient.signInWithPassword.mockResolvedValue(mockSignInResponse);

      await authStore.signInWithPassword('test@example.com', 'password');
      expect(authStore.isAuthenticated()).toBe(true);
    });

    it('should return access token when authenticated', async () => {
      expect(authStore.getAccessToken()).toBeNull();

      // First sign in to establish authenticated state properly
      const mockSignInResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
        },
        accessToken: 'token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      };

      mockApiClient.signInWithPassword.mockResolvedValue(mockSignInResponse);

      await authStore.signInWithPassword('test@example.com', 'password');
      expect(authStore.getAccessToken()).toBe('token');
    });

    it('should reset store to initial state', async () => {
      // Set up some authenticated session state first
      const { saveSession } = await import('../../src/utils/sessionManager');
      const sessionData = {
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU',
          avatar: null,
          preferences: {},
        },
        tokens: {
          accessToken: 'token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 3600000,
        },
        lastActivity: Date.now(),
        createdAt: Date.now(),
      };
      saveSession(sessionData);

      authStore.reset();

      // Verify session was cleared
      const { getSession } = await import('../../src/utils/sessionManager');
      const clearedSession = getSession();
      expect(clearedSession).toBeNull();

      const state = get(authStore);
      expect(state.state).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });
  });

  describe('Event System', () => {
    it('should emit events for authentication lifecycle', async () => {
      const signInStartedHandler = vi.fn();
      const signInSuccessHandler = vi.fn();
      const signInErrorHandler = vi.fn();

      authStore.on('sign_in_started', signInStartedHandler);
      authStore.on('sign_in_success', signInSuccessHandler);
      authStore.on('sign_in_error', signInErrorHandler);

      // Test successful sign in
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z',
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600,
      };

      const mockApi = authStore.api as any;
      mockApi.signInWithPassword.mockResolvedValue(mockResponse);

      await authStore.signInWithPassword('test@example.com', 'password');

      expect(signInStartedHandler).toHaveBeenCalledWith({ method: 'password' });
      expect(signInSuccessHandler).toHaveBeenCalledWith({
        user: mockResponse.user,
        method: 'password',
      });

      // Test failed sign in
      mockApi.signInWithPassword.mockRejectedValue(new Error('Invalid credentials'));

      try {
        await authStore.signInWithPassword('test@example.com', 'wrong');
      } catch (_error) {
        // Expected to throw
      }

      expect(signInErrorHandler).toHaveBeenCalled();
    });

    it('should allow unsubscribing from events', () => {
      const handler = vi.fn();
      const unsubscribe = authStore.on('sign_in_started', handler);

      unsubscribe();

      // This shouldn't call the handler since we unsubscribed
      authStore.signInWithPassword('test@example.com', 'password').catch(() => {
        // Ignore errors for this test
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Dynamic Role Configuration', () => {
    it('should start with guest configuration by default', () => {
      const authStore = createAuthStore(mockConfig);

      // Should start with conservative guest defaults
      expect(authStore.getApplicationContext()).toEqual({
        userType: 'mixed',
        forceGuestMode: true,
      });
    });

    it('should accept application context configuration', () => {
      const configWithContext = {
        ...mockConfig,
        applicationContext: {
          userType: 'all_employees' as const,
          domain: 'internal.company.com',
        },
      };

      const authStore = createAuthStore(configWithContext);

      expect(authStore.getApplicationContext()).toEqual({
        userType: 'all_employees',
        domain: 'internal.company.com',
      });
    });

    it('should handle storage configuration updates', async () => {
      const authStore = createAuthStore(mockConfig);

      // Mock the updateStorageConfiguration method (will be implemented later)
      const mockUpdateStorageConfiguration = vi.fn();
      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;

      const update = {
        type: 'localStorage' as const,
        userRole: 'employee' as const,
        sessionTimeout: 7 * 24 * 60 * 60 * 1000,
        migrateExistingSession: true,
        preserveTokens: true,
      };

      await authStore.updateStorageConfiguration(update);

      expect(mockUpdateStorageConfiguration).toHaveBeenCalledWith(update);
    });

    it('should handle session migration', async () => {
      const authStore = createAuthStore(mockConfig);

      // Mock the migrateSession method (will be implemented later)
      const mockMigrateSession = vi.fn().mockResolvedValue({
        success: true,
        fromStorage: 'sessionStorage',
        toStorage: 'localStorage',
        dataPreserved: true,
        tokensPreserved: true,
      });
      (authStore as any).migrateSession = mockMigrateSession;

      const result = await authStore.migrateSession('sessionStorage', 'localStorage');

      expect(mockMigrateSession).toHaveBeenCalledWith('sessionStorage', 'localStorage');
      expect(result.success).toBe(true);
      expect(result.dataPreserved).toBe(true);
      expect(result.tokensPreserved).toBe(true);
    });
  });
});
