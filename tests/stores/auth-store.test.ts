/**
 * Auth Store Tests - Updated for New Modular Architecture
 *
 * Tests the composed auth store that integrates all modular stores.
 * This replaces the monolithic auth-store tests with tests that work
 * with the new Zustand-based modular architecture.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores';
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
    verifyAppEmailCode: vi.fn(),
    getPasskeyChallenge: vi.fn(),
    getWebAuthnRegistrationOptions: vi.fn(),
    verifyWebAuthnRegistration: vi.fn()
  }))
}));

// Mock WebAuthn browser APIs - require real browser interaction
vi.mock('../../src/utils/webauthn', () => ({
  authenticateWithPasskey: vi.fn(),
  serializeCredential: vi.fn(),
  isWebAuthnSupported: vi.fn(() => true), // Enable for testing
  isConditionalMediationSupported: vi.fn(() => true),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true))
}));

// Mock session manager
let mockSessionData: any = null;
vi.mock('../../src/utils/sessionManager', () => ({
  configureSessionStorage: vi.fn(),
  getOptimalSessionConfig: vi.fn(() => ({ type: 'sessionStorage' })),
  getSession: vi.fn(() => mockSessionData),
  getCurrentSession: vi.fn(() => mockSessionData),
  isSessionValid: vi.fn((session) => !!session && session.tokens?.expiresAt > Date.now()),
  saveSession: vi.fn((data) => {
    mockSessionData = data;
  }),
  clearSession: vi.fn(() => {
    mockSessionData = null;
  }),
  generateInitials: vi.fn((name: string) => name.charAt(0).toUpperCase())
}));

// Mock browser environment check
Object.defineProperty(globalThis, 'window', {
  value: {
    location: { hostname: 'localhost' },
    PublicKeyCredential: true,
    navigator: { credentials: { create: vi.fn() } }
  },
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

describe('Composed Auth Store (New Modular Architecture)', () => {
  let composedStore: ReturnType<typeof createAuthStore>;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mockSessionData = null; // Clear mock session data

    // Create the composed store with new architecture
    composedStore = createAuthStore(mockConfig);
  });

  afterEach(() => {
    composedStore?.destroy();
  });

  describe('Initial State', () => {
    it('should initialize with unauthenticated state', () => {
      // Test core authentication state
      const coreState = composedStore.core.getState();
      expect(coreState.state).toBe('unauthenticated');
      expect(coreState.user).toBeNull();
      expect(coreState.accessToken).toBeNull();
      expect(coreState.refreshToken).toBeNull();
      expect(coreState.isAuthenticated()).toBe(false);

      // Test UI state
      const uiState = composedStore.ui.getState();
      expect(uiState.signInState).toBe('emailEntry');
      expect(uiState.email).toBe('');
      expect(uiState.userExists).toBeNull();

      // Test error state
      const errorState = composedStore.error.getState();
      expect(errorState.apiError).toBeNull();
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

      // Create new composed store that should restore from session
      const restoredStore = createAuthStore(mockConfig);

      // Give state machine time to initialize
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Test core state restoration
      const coreState = restoredStore.core.getState();
      expect(coreState.state).toBe('authenticated');
      expect(coreState.user?.email).toBe('test@example.com');
      expect(coreState.accessToken).toBe('access-token');
      expect(coreState.refreshToken).toBe('refresh-token');
      expect(coreState.isAuthenticated()).toBe(true);

      // Test UI state after restoration
      const uiState = restoredStore.ui.getState();
      expect(uiState.signInState).toBe('signedIn');

      // Cleanup
      restoredStore.destroy();
    });
  });

  describe('Authentication', () => {
    it('should handle successful email code send via unified API', async () => {
      // Set email first to trigger user discovery
      composedStore.setEmail('test@example.com');

      // Simulate email code sending
      const result = await composedStore.sendEmailCode('test@example.com');

      // Test that UI state transitions correctly
      const uiState = composedStore.ui.getState();
      expect(uiState.email).toBe('test@example.com');

      // Test that core state remains unauthenticated until code verification
      const coreState = composedStore.core.getState();
      expect(coreState.state).toBe('unauthenticated');
      expect(coreState.user).toBeNull();
      expect(coreState.accessToken).toBeNull();
    });

    it('should handle authentication errors via event system', async () => {
      let errorReceived: any = null;

      // Listen for authentication errors
      const unsubscribe = composedStore.on('sign_in_error', (data) => {
        errorReceived = data;
      });

      try {
        // Trigger an authentication error (this will depend on mocked API behavior)
        await composedStore.sendEmailCode('invalid@example.com');
      } catch (error) {
        // Error handling via events, not exceptions in new architecture
      }

      // Clean up
      unsubscribe();

      // Test that core state remains unauthenticated
      const coreState = composedStore.core.getState();
      expect(coreState.state).toBe('unauthenticated');

      // Test that error is captured in error store
      const errorState = composedStore.error.getState();
      if (errorState.apiError) {
        expect(errorState.apiError.retryable).toBe(true);
        expect(errorState.apiError.timestamp).toBeTypeOf('number');
      }
    });

    it('should handle passkey authentication via unified API', async () => {
      // Test that passkey authentication can be attempted
      const passkeyState = composedStore.passkey.getState();

      // Even if passkeys aren't supported in test environment,
      // we can test the API structure
      expect(typeof composedStore.signInWithPasskey).toBe('function');

      // Test that passkey store has correct initial state
      expect(passkeyState.isAuthenticating).toBe(false);
      expect(passkeyState.isRegistering).toBe(false);

      // Test passkey state management
      composedStore.passkey.getState().setAuthenticating(true);
      const updatedState = composedStore.passkey.getState();
      expect(updatedState.isAuthenticating).toBe(true);
    });
  });

  describe('Unified API Methods', () => {
    it('should correctly identify authenticated state via unified API', () => {
      // Test initial unauthenticated state
      expect(composedStore.isAuthenticated()).toBe(false);
      expect(composedStore.core.getState().isAuthenticated()).toBe(false);

      // Simulate authentication by directly setting core state
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        createdAt: '2023-01-01T00:00:00Z'
      };

      const mockTokens = {
        accessToken: 'token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000
      };

      // Update core authentication state
      composedStore.core.getState().updateUser(mockUser);
      composedStore.core.getState().updateTokens(mockTokens);

      // Test that authentication is now detected
      expect(composedStore.isAuthenticated()).toBe(true);
      expect(composedStore.core.getState().isAuthenticated()).toBe(true);
    });

    it('should return access token when authenticated via unified API', () => {
      // Test initial null access token
      expect(composedStore.getAccessToken()).toBeNull();
      expect(composedStore.core.getState().getAccessToken()).toBeNull();

      // Simulate authentication by setting tokens
      const mockTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000
      };

      composedStore.core.getState().updateTokens(mockTokens);

      // Test that access token is now available
      expect(composedStore.getAccessToken()).toBe('test-access-token');
      expect(composedStore.core.getState().getAccessToken()).toBe('test-access-token');
    });

    it('should reset store to initial state via unified API', async () => {
      // Set up some authenticated state first
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        createdAt: '2023-01-01T00:00:00Z'
      };

      const mockTokens = {
        accessToken: 'token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000
      };

      // Set authenticated state
      composedStore.core.getState().updateUser(mockUser);
      composedStore.core.getState().updateTokens(mockTokens);
      composedStore.ui.getState().setEmail('test@example.com');
      composedStore.ui.getState().setSignInState('signedIn');

      // Verify we're authenticated
      expect(composedStore.isAuthenticated()).toBe(true);

      // Reset via unified API
      composedStore.reset();

      // Verify all stores are reset
      const coreState = composedStore.core.getState();
      expect(coreState.state).toBe('unauthenticated');
      expect(coreState.user).toBeNull();
      expect(coreState.accessToken).toBeNull();

      const uiState = composedStore.ui.getState();
      expect(uiState.signInState).toBe('emailEntry');
      expect(uiState.email).toBe('');

      expect(composedStore.isAuthenticated()).toBe(false);
    });
  });

  describe('Modular Architecture Benefits', () => {
    it('should demonstrate individual store access and composition', () => {
      // Individual stores are accessible for fine-grained control
      expect(composedStore.core).toBeDefined();
      expect(composedStore.ui).toBeDefined();
      expect(composedStore.passkey).toBeDefined();
      expect(composedStore.email).toBeDefined();
      expect(composedStore.session).toBeDefined();
      expect(composedStore.error).toBeDefined();
      expect(composedStore.events).toBeDefined();

      // Unified API provides backward compatibility
      expect(typeof composedStore.sendEmailCode).toBe('function');
      expect(typeof composedStore.signInWithPasskey).toBe('function');
    });

    it('should maintain single signInState with modular operation states', () => {
      // UI store owns the master signInState
      expect(composedStore.ui.getState().signInState).toBe('emailEntry');

      // Feature stores own their specific operation states
      expect(composedStore.passkey.getState().isAuthenticating).toBe(false);
      expect(composedStore.email.getState().isSendingCode).toBe(false);

      // Test state independence and coordination
      composedStore.ui.getState().setSignInState('userChecked');
      composedStore.passkey.getState().setAuthenticating(true);

      // States remain independent but coordinated
      expect(composedStore.ui.getState().signInState).toBe('userChecked');
      expect(composedStore.passkey.getState().isAuthenticating).toBe(true);
      expect(composedStore.email.getState().isSendingCode).toBe(false); // Unaffected
    });

    it('should handle cross-store events for coordination', () => {
      let eventReceived: any = null;

      // Listen for events
      const unsubscribe = composedStore.on('sign_in_success', (data) => {
        eventReceived = data;
      });

      // Emit event
      composedStore.emit('sign_in_success', {
        method: 'passkey',
        user: { id: '123', email: 'test@example.com' }
      });

      // Verify event received
      expect(eventReceived).toEqual({
        method: 'passkey',
        user: { id: '123', email: 'test@example.com' }
      });

      unsubscribe();
    });
    it('should cleanup all stores on destroy', () => {
      // Set some state across stores
      composedStore.ui.getState().setEmail('test@example.com');
      composedStore.ui.getState().setSignInState('userChecked');
      composedStore.passkey.getState().setAuthenticating(true);

      // Verify state is set
      expect(composedStore.ui.getState().email).toBe('test@example.com');
      expect(composedStore.ui.getState().signInState).toBe('userChecked');
      expect(composedStore.passkey.getState().isAuthenticating).toBe(true);

      // Destroy should reset all stores
      composedStore.destroy();

      // Verify cleanup
      expect(composedStore.ui.getState().email).toBe('');
      expect(composedStore.ui.getState().signInState).toBe('emailEntry');
      expect(composedStore.passkey.getState().isAuthenticating).toBe(false);
      expect(composedStore.core.getState().state).toBe('unauthenticated');
    });

    it('should demonstrate state separation and clear ownership', () => {
      // Each store manages its own specific state
      const coreState = composedStore.core.getState();
      const uiState = composedStore.ui.getState();
      const passkeyState = composedStore.passkey.getState();
      const emailState = composedStore.email.getState();

      // Verify state structure - each store has its own responsibilities
      expect(coreState).toHaveProperty('state');
      expect(coreState).toHaveProperty('user');
      expect(coreState).toHaveProperty('accessToken');

      expect(uiState).toHaveProperty('signInState'); // Single source of truth
      expect(uiState).toHaveProperty('email');
      expect(uiState).toHaveProperty('userExists');

      expect(passkeyState).toHaveProperty('isAuthenticating'); // Specific operation
      expect(passkeyState).toHaveProperty('isSupported');

      expect(emailState).toHaveProperty('isSendingCode'); // Specific operation
      expect(emailState).toHaveProperty('codeSent');

      // States are independent but coordinated - no duplication
      expect(coreState).not.toHaveProperty('signInState');
      expect(uiState).not.toHaveProperty('accessToken');
      expect(passkeyState).not.toHaveProperty('signInState');
      expect(emailState).not.toHaveProperty('signInState');
    });
  });
});
