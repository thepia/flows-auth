/**
 * Auth Store Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig, SignInResponse } from '../../src/types';

// Mock the API client
vi.mock('../../src/api/auth-api', () => ({
  AuthApiClient: vi.fn().mockImplementation(() => ({
    signIn: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithPasskey: vi.fn(),
    signInWithMagicLink: vi.fn(),
    refreshToken: vi.fn(),
    signOut: vi.fn()
  }))
}));

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
    showPoweredBy: true
  }
};

describe('Auth Store', () => {
  let authStore: ReturnType<typeof createAuthStore>;

  beforeEach(() => {
    localStorage.clear();
    authStore = createAuthStore(mockConfig);
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

    it('should restore state from localStorage if tokens exist', () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        createdAt: '2023-01-01T00:00:00Z'
      };

      localStorage.setItem('auth_access_token', 'access-token');
      localStorage.setItem('auth_refresh_token', 'refresh-token');
      localStorage.setItem('auth_expires_at', (Date.now() + 3600000).toString());
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      const restoredStore = createAuthStore(mockConfig);
      const state = get(restoredStore);

      expect(state.state).toBe('authenticated');
      expect(state.user).toEqual(mockUser);
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
          createdAt: '2023-01-01T00:00:00Z'
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600
      };

      // Mock the API call
      const mockApi = authStore.api as any;
      mockApi.signInWithPassword.mockResolvedValue(mockResponse);

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

      const mockApi = authStore.api as any;
      mockApi.signInWithPassword.mockRejectedValue(mockError);

      await expect(
        authStore.signInWithPassword('test@example.com', 'wrong-password')
      ).rejects.toThrow('Invalid credentials');

      const state = get(authStore);
      expect(state.state).toBe('error');
      expect(state.error).toEqual({
        code: 'invalid_credentials',
        message: 'Invalid credentials'
      });
    });

    it('should handle magic link sign in', async () => {
      const mockResponse: SignInResponse = {
        step: 'magic_link_sent',
        message: 'Magic link sent to your email'
      };

      const mockApi = authStore.api as any;
      mockApi.signInWithMagicLink.mockResolvedValue(mockResponse);

      const result = await authStore.signInWithMagicLink('test@example.com');

      expect(result.step).toBe('magic_link_sent');
      expect(result.message).toBe('Magic link sent to your email');

      const state = get(authStore);
      expect(state.state).toBe('unauthenticated'); // Still unauthenticated until link is clicked
    });
  });

  describe('Token Management', () => {
    it('should save tokens to localStorage on successful authentication', async () => {
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

      const mockApi = authStore.api as any;
      mockApi.signInWithPassword.mockResolvedValue(mockResponse);

      await authStore.signInWithPassword('test@example.com', 'password');

      expect(localStorage.getItem('auth_access_token')).toBe('access-token');
      expect(localStorage.getItem('auth_refresh_token')).toBe('refresh-token');
      expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(mockResponse.user));
      expect(localStorage.getItem('auth_expires_at')).toBeTruthy();
    });

    it('should clear tokens on sign out', async () => {
      // Set up authenticated state
      localStorage.setItem('auth_access_token', 'access-token');
      localStorage.setItem('auth_refresh_token', 'refresh-token');
      localStorage.setItem('auth_user', JSON.stringify({ id: '123' }));

      const mockApi = authStore.api as any;
      mockApi.signOut.mockResolvedValue(undefined);

      await authStore.signOut();

      expect(localStorage.getItem('auth_access_token')).toBeNull();
      expect(localStorage.getItem('auth_refresh_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();

      const state = get(authStore);
      expect(state.state).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });

    it('should handle token refresh', async () => {
      // Set up initial state with tokens
      const initialState = get(authStore);
      authStore.reset();
      
      // Mock initial authenticated state
      localStorage.setItem('auth_refresh_token', 'refresh-token');
      
      const mockRefreshResponse: SignInResponse = {
        step: 'success',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      };

      const mockApi = authStore.api as any;
      mockApi.refreshToken.mockResolvedValue(mockRefreshResponse);

      await authStore.refreshTokens();

      const state = get(authStore);
      expect(state.accessToken).toBe('new-access-token');
      expect(localStorage.getItem('auth_access_token')).toBe('new-access-token');
    });
  });

  describe('Helper Methods', () => {
    it('should correctly identify authenticated state', () => {
      expect(authStore.isAuthenticated()).toBe(false);

      // Simulate authenticated state
      localStorage.setItem('auth_access_token', 'token');
      localStorage.setItem('auth_expires_at', (Date.now() + 3600000).toString());
      
      const authenticatedStore = createAuthStore(mockConfig);
      expect(authenticatedStore.isAuthenticated()).toBe(true);
    });

    it('should return access token when authenticated', () => {
      expect(authStore.getAccessToken()).toBeNull();

      localStorage.setItem('auth_access_token', 'token');
      localStorage.setItem('auth_expires_at', (Date.now() + 3600000).toString());
      
      const authenticatedStore = createAuthStore(mockConfig);
      expect(authenticatedStore.getAccessToken()).toBe('token');
    });

    it('should reset store to initial state', () => {
      // Set up some state
      localStorage.setItem('auth_access_token', 'token');
      localStorage.setItem('auth_user', JSON.stringify({ id: '123' }));

      authStore.reset();

      const state = get(authStore);
      expect(state.state).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(localStorage.getItem('auth_access_token')).toBeNull();
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
          createdAt: '2023-01-01T00:00:00Z'
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600
      };

      const mockApi = authStore.api as any;
      mockApi.signInWithPassword.mockResolvedValue(mockResponse);

      await authStore.signInWithPassword('test@example.com', 'password');

      expect(signInStartedHandler).toHaveBeenCalledWith({ method: 'password' });
      expect(signInSuccessHandler).toHaveBeenCalledWith({
        user: mockResponse.user,
        method: 'password'
      });

      // Test failed sign in
      mockApi.signInWithPassword.mockRejectedValue(new Error('Invalid credentials'));

      try {
        await authStore.signInWithPassword('test@example.com', 'wrong');
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
      authStore.signInWithPassword('test@example.com', 'password').catch(() => {
        // Ignore errors for this test
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});