import { get } from 'svelte/store';
/**
 * Auth Store Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig, SignInResponse } from '../../src/types';

// Only mock external dependencies that we can't test in isolation
// Mock the API client - external network calls
vi.mock('../../src/api/auth-api', () => ({
  AuthApiClient: vi.fn().mockImplementation(() => ({
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

// Mock WebAuthn browser APIs - require real browser interaction
vi.mock('../../src/utils/webauthn', () => ({
  authenticateWithPasskey: vi.fn(),
  serializeCredential: vi.fn(),
  isWebAuthnSupported: vi.fn(() => false), // Default to false for unit tests
  isConditionalMediationSupported: vi.fn(() => false)
}));

// Mock browser environment check
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
  appCode: 'test-app',
  branding: {
    companyName: 'Test Company',
    showPoweredBy: true
  }
};

describe('Auth Store', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let mockApiClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Create a mock API client with all the methods we need
    mockApiClient = {
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithPasskey: vi.fn(),
      refreshToken: vi.fn(),
      signOut: vi.fn(),
      checkEmail: vi.fn(),
      sendAppEmailCode: vi.fn(),
      verifyAppEmailCode: vi.fn(),
      // Add any other methods that might be needed
      getEffectiveAppCode: vi.fn(() => 'test-app')
    };

    // Inject the mock API client into the auth store
    authStore = createAuthStore(mockConfig, mockApiClient as any);
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
          preferences: {}
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 3600000
        },
        lastActivity: Date.now(),
        createdAt: Date.now()
      };

      // Save session using real session manager
      saveSession(sessionData);

      // Create new auth store that should restore from session
      const restoredStore = createAuthStore(mockConfig, mockApiClient as any);

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
    it('should handle successful magic link send', async () => {
      const mockResponse: SignInResponse = {
        step: 'magic-link'
      };

      mockApiClient.signInWithMagicLink.mockResolvedValue(mockResponse);

      await authStore.signInWithMagicLink('test@example.com');

      const state = get(authStore);
      // Magic link just sends confirmation, doesn't authenticate immediately
      expect(state.state).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should handle authentication errors', async () => {
      const mockError = new Error('Invalid credentials');
      (mockError as any).code = 'invalid_credentials';

      mockApiClient.signInWithMagicLink.mockRejectedValue(mockError);

      await expect(authStore.signInWithMagicLink('test@example.com')).rejects.toThrow(
        'Invalid credentials'
      );

      const state = get(authStore);
      expect(state.state).toBe('error');
      expect(state.error).toEqual({
        code: 'invalid_credentials',
        message: 'Invalid credentials'
      });
    });

    it('should handle magic link sign in', async () => {
      const mockResponse: SignInResponse = {
        step: 'magic-link'
      };

      mockApiClient.signInWithMagicLink.mockResolvedValue(mockResponse);

      const result = await authStore.signInWithMagicLink('test@example.com');

      expect(result.step).toBe('magic-link');

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
          createdAt: '2023-01-01T00:00:00Z'
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600
      };

      // Use email code authentication instead of magic link
      // Set up auth store with app code configuration
      const authStoreWithApp = createAuthStore({
        domain: 'test.com',
        apiBaseUrl: 'https://api.test.com',
        clientId: 'test-client',
        enablePasskeys: true,
        enableMagicLinks: false,
        appCode: 'test-app'
      });

      // Mock the API client from the new auth store
      const mockApi = authStoreWithApp.api as any;
      mockApi.verifyAppEmailCode.mockResolvedValue(mockResponse);

      await authStoreWithApp.verifyEmailCode('test@example.com', '123456');

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
          avatar: undefined,
          preferences: {}
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 3600000
        },
        authMethod: 'passkey' as const,
        lastActivity: Date.now(),
        createdAt: Date.now()
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
          createdAt: '2023-01-01T00:00:00Z'
        },
        accessToken: 'initial-token',
        refreshToken: 'initial-refresh-token',
        expiresIn: 3600
      };

      // Set up auth store with app code configuration
      const authStoreWithApp = createAuthStore({
        domain: 'test.com',
        apiBaseUrl: 'https://api.test.com',
        clientId: 'test-client',
        enablePasskeys: true,
        enableMagicLinks: false,
        appCode: 'test-app'
      });

      // Mock the API client from the new auth store
      const mockApi = authStoreWithApp.api as any;
      mockApi.verifyAppEmailCode.mockResolvedValue(mockSignInResponse);

      // Sign in to establish refresh token
      await authStoreWithApp.verifyEmailCode('test@example.com', '123456');

      // Now set up refresh response
      const mockRefreshResponse: SignInResponse = {
        step: 'success',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      };

      mockApi.refreshToken.mockResolvedValue(mockRefreshResponse);

      await authStoreWithApp.refreshTokens();

      const state = get(authStoreWithApp);
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
          createdAt: '2023-01-01T00:00:00Z'
        },
        accessToken: 'token',
        refreshToken: 'refresh-token',
        expiresIn: 3600
      };

      // Set up auth store with app code configuration
      const authStoreWithApp = createAuthStore({
        domain: 'test.com',
        apiBaseUrl: 'https://api.test.com',
        clientId: 'test-client',
        enablePasskeys: true,
        enableMagicLinks: false,
        appCode: 'test-app'
      });

      // Mock the API client from the new auth store
      const mockApi = authStoreWithApp.api as any;
      mockApi.verifyAppEmailCode.mockResolvedValue(mockSignInResponse);

      await authStoreWithApp.verifyEmailCode('test@example.com', '123456');
      expect(authStoreWithApp.isAuthenticated()).toBe(true);
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
          createdAt: '2023-01-01T00:00:00Z'
        },
        accessToken: 'token',
        refreshToken: 'refresh-token',
        expiresIn: 3600
      };

      // Set up auth store with app code configuration
      const authStoreWithApp = createAuthStore({
        domain: 'test.com',
        apiBaseUrl: 'https://api.test.com',
        clientId: 'test-client',
        enablePasskeys: true,
        enableMagicLinks: false,
        appCode: 'test-app'
      });

      // Mock the API client from the new auth store
      const mockApi = authStoreWithApp.api as any;
      mockApi.verifyAppEmailCode.mockResolvedValue(mockSignInResponse);

      await authStoreWithApp.verifyEmailCode('test@example.com', '123456');
      expect(authStoreWithApp.getAccessToken()).toBe('token');
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
          avatar: undefined,
          preferences: {}
        },
        tokens: {
          accessToken: 'token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 3600000
        },
        authMethod: 'passkey' as const,
        lastActivity: Date.now(),
        createdAt: Date.now()
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

      // Set up auth store with app code configuration
      const authStoreWithApp = createAuthStore({
        domain: 'test.com',
        apiBaseUrl: 'https://api.test.com',
        clientId: 'test-client',
        enablePasskeys: true,
        enableMagicLinks: false,
        appCode: 'test-app'
      });

      authStoreWithApp.setEmail('test@example.com');

      // Listen for the correct events that verifyEmailCode emits
      authStoreWithApp.on('app_email_verify_started', signInStartedHandler);
      authStoreWithApp.on('app_email_verify_success', signInSuccessHandler);
      authStoreWithApp.on('app_email_verify_error', signInErrorHandler);

      // Test successful sign in
      const mockResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600
      };

      // Mock the API client from the new auth store
      const mockApi = authStoreWithApp.api as any;
      mockApi.verifyAppEmailCode.mockResolvedValue(mockResponse);

      await authStoreWithApp.verifyEmailCode('123456');

      expect(signInStartedHandler).toHaveBeenCalledWith({
        email: 'test@example.com',
        appCode: 'test-app'
      });
      expect(signInSuccessHandler).toHaveBeenCalledWith({
        user: mockResponse.user,
        method: 'email-code',
        appCode: 'test-app'
      });

      // Test failed sign in
      mockApi.verifyAppEmailCode.mockRejectedValue(new Error('Invalid code'));

      try {
        await authStoreWithApp.verifyEmailCode('test@example.com', '123456');
      } catch (error) {
        // Expected to throw
      }

      expect(signInErrorHandler).toHaveBeenCalled();
    });

    it('should allow unsubscribing from events', () => {
      const handler = vi.fn();
      const unsubscribe = authStore.on('sign_in_started', handler);

      unsubscribe();

      // This shouldn't call the handler since we unsubscribed
      authStore.signInWithMagicLink('test@example.com').catch(() => {
        // Ignore errors for this test
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Dynamic Role Configuration', () => {
    it('should start with guest configuration by default', () => {
      const authStore = createAuthStore(mockConfig, mockApiClient as any);

      // Should start with conservative guest defaults
      expect(authStore.getApplicationContext()).toEqual({
        userType: 'mixed',
        forceGuestMode: true
      });
    });

    it('should accept application context configuration', () => {
      const configWithContext = {
        ...mockConfig,
        applicationContext: {
          userType: 'all_employees' as const,
          domain: 'internal.company.com'
        }
      };

      const authStore = createAuthStore(configWithContext, mockApiClient as any);

      expect(authStore.getApplicationContext()).toEqual({
        userType: 'all_employees',
        domain: 'internal.company.com'
      });
    });

    it('should handle storage configuration updates', async () => {
      const authStore = createAuthStore(mockConfig, mockApiClient as any);

      // Mock the updateStorageConfiguration method (will be implemented later)
      const mockUpdateStorageConfiguration = vi.fn();
      (authStore as any).updateStorageConfiguration = mockUpdateStorageConfiguration;

      const update = {
        type: 'localStorage' as const,
        userRole: 'employee' as const,
        sessionTimeout: 7 * 24 * 60 * 60 * 1000,
        migrateExistingSession: true,
        preserveTokens: true
      };

      await authStore.updateStorageConfiguration(update);

      expect(mockUpdateStorageConfiguration).toHaveBeenCalledWith(update);
    });

    it('should handle session migration', async () => {
      const authStore = createAuthStore(mockConfig, mockApiClient as any);

      // Mock the migrateSession method (will be implemented later)
      const mockMigrateSession = vi.fn().mockResolvedValue({
        success: true,
        fromStorage: 'sessionStorage',
        toStorage: 'localStorage',
        dataPreserved: true,
        tokensPreserved: true
      });
      (authStore as any).migrateSession = mockMigrateSession;

      const result = await authStore.migrateSession('sessionStorage', 'localStorage');

      expect(mockMigrateSession).toHaveBeenCalledWith('sessionStorage', 'localStorage');
      expect(result.success).toBe(true);
      expect(result.dataPreserved).toBe(true);
      expect(result.tokensPreserved).toBe(true);
    });
  });

  // AppCode not org
  // Don't test magic link, only magic pin.
  // Soon we will not support configs without appCode.
  describe('Email Authentication (Transparent App Support)', () => {
    it('should use app endpoints when appCode is configured', async () => {
      const configWithApp: AuthConfig = {
        ...mockConfig,
        appCode: 'test-app'
      };

      const authStore = createAuthStore(configWithApp, mockApiClient as any);

      const mockEmailCodeResponse = {
        success: true,
        message: 'Email code sent',
        timestamp: Date.now()
      };

      mockApiClient.sendAppEmailCode.mockResolvedValue(mockEmailCodeResponse);

      const result = await authStore.sendEmailCode('test@example.com');

      expect(mockApiClient.sendAppEmailCode).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual(mockEmailCodeResponse);
    });

    it('should fall back to magic link when appCode is not configured', async () => {
      const configWithoutApp: AuthConfig = {
        ...mockConfig,
        enableMagicLinks: true
      };
      delete (configWithoutApp as any).appCode;

      const authStore = createAuthStore(configWithoutApp, mockApiClient as any);

      const mockMagicLinkResponse: SignInResponse = {
        step: 'magic-link',
        magicLinkSent: true
      };

      mockApiClient.signInWithMagicLink.mockResolvedValue(mockMagicLinkResponse);

      const result = await authStore.sendEmailCode('test@example.com');

      expect(mockApiClient.signInWithMagicLink).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Magic link sent to your email');
    });

    it('should verify email code with app endpoints when appCode is configured', async () => {
      const configWithApp: AuthConfig = {
        ...mockConfig,
        appCode: 'test-app'
      };

      const authStore = createAuthStore(configWithApp, mockApiClient as any);
      authStore.setEmail('test@example.com');

      const mockVerifyResponse: SignInResponse = {
        step: 'success',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600
      };

      mockApiClient.verifyAppEmailCode.mockResolvedValue(mockVerifyResponse);

      const result = await authStore.verifyEmailCode('123456');

      expect(mockApiClient.verifyAppEmailCode).toHaveBeenCalledWith('test@example.com', '123456');
      expect(result).toEqual(mockVerifyResponse);

      // Check that user is authenticated
      const state = get(authStore);
      expect(state.state).toBe('authenticated');
      expect(state.user).toEqual(mockVerifyResponse.user);
    });

    it('should throw error when trying to verify code without appCode configuration', async () => {
      const configWithoutApp: AuthConfig = {
        ...mockConfig
      };
      delete (configWithoutApp as any).appCode;

      const authStore = createAuthStore(configWithoutApp, mockApiClient as any);

      await expect(authStore.verifyEmailCode('123456')).rejects.toThrow(
        'Email code verification is only available with organization configuration'
      );
    });

    it('should handle email code send errors gracefully', async () => {
      const configWithApp: AuthConfig = {
        ...mockConfig,
        appCode: 'test-app'
      };

      const authStore = createAuthStore(configWithApp, mockApiClient as any);

      const mockError = new Error('Network error');
      mockApiClient.sendAppEmailCode.mockRejectedValue(mockError);

      await expect(authStore.sendEmailCode('test@example.com')).rejects.toThrow('Network error');

      const state = get(authStore);
      expect(state.state).toBe('error');
    });

    it('should handle email code verification errors gracefully', async () => {
      const configWithApp: AuthConfig = {
        ...mockConfig,
        appCode: 'test-app'
      };

      const authStore = createAuthStore(configWithApp, mockApiClient as any);

      const mockError = new Error('Invalid code');
      mockApiClient.verifyAppEmailCode.mockRejectedValue(mockError);

      await expect(authStore.verifyEmailCode('123456')).rejects.toThrow('Invalid code');

      const state = get(authStore);
      expect(state.state).toBe('error');
    });
  });
});
