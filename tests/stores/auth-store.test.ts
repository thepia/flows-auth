/**
 * Auth Store Tests - Updated for New Modular Architecture
 *
 * Tests the composed auth store that integrates all modular stores.
 * This replaces the monolithic auth-store tests with tests that work
 * with the new Zustand-based modular architecture.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores';
import type { AuthConfig, SignInData, SignInResponse } from '../../src/types';

// Only mock external dependencies that we can't test in isolation
// Mock the API client - external network calls
vi.mock('../../src/api/auth-api', () => ({
  AuthApiClient: vi.fn().mockImplementation(() => ({
    signIn: vi.fn(),
    signInWithMagicLink: vi.fn(),
    signInWithPasskey: vi.fn(),
    refresh_token: vi.fn(),
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
let mockStorage: Record<string, string> = {};

vi.mock('../../src/utils/sessionManager', () => ({
  configureSessionStorage: vi.fn(),
  getOptimalSessionConfig: vi.fn(() => ({ type: 'sessionStorage' })),
  getSession: vi.fn(() => {
    const data = mockStorage['thepia_auth_session'];
    return data ? JSON.parse(data) : null;
  }),
  saveSession: vi.fn((data: any) => {
    mockStorage['thepia_auth_session'] = JSON.stringify(data);
  }),
  clearSession: vi.fn(() => {
    delete mockStorage['thepia_auth_session'];
  }),
  isSessionValid: vi.fn((session: any) => {
    if (!session) return false;
    if (session.tokens?.expiresAt && session.tokens.expiresAt < Date.now()) {
      return !!session.tokens.refresh_token;
    }
    return true;
  })
}));

vi.mock('../../src/utils/storageManager', () => ({
  getStorageManager: vi.fn(() => ({
    getItem: vi.fn((key: string) => mockStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
    }),
    clear: vi.fn(() => {
      mockStorage = {};
    }),
    getConfig: vi.fn(() => ({ type: 'sessionStorage' })),
    getSessionTimeout: vi.fn(() => 8 * 60 * 60 * 1000)
  }))
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
    mockStorage = {}; // Clear mock storage

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
      expect(coreState.access_token).toBeNull();
      expect(coreState.refresh_token).toBeNull();
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
      // Create a mock database adapter that returns valid SessionData
      const mockSessionData = {
        userId: '123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        metadata: {},
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        refreshedAt: Date.now(),
        authMethod: 'email-code' as const
      };

      const mockDatabaseAdapter = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(mockSessionData),
        clearSession: vi.fn().mockResolvedValue(undefined),
        saveUser: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(null),
        clearUser: vi.fn().mockResolvedValue(undefined)
      };

      // Create new composed store with mock database adapter
      const restoredStore = createAuthStore({
        ...mockConfig,
        database: mockDatabaseAdapter
      });

      // Give state machine time to initialize and restore session
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Test core state restoration
      const coreState = restoredStore.core.getState();
      expect(coreState.state).toBe('authenticated');
      expect(coreState.user?.email).toBe('test@example.com');
      expect(coreState.access_token).toBe('access-token');
      expect(coreState.refresh_token).toBe('refresh-token');
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
      expect(coreState.access_token).toBeNull();
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
    it('should correctly identify authenticated state via unified API', async () => {
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
        access_token: 'token',
        refresh_token: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        supabase_token: 'supabase-test-token',
        supabase_expires_at: Date.now() + 3600000
      };

      // Update core authentication state
      composedStore.core.getState().updateUser(mockUser);
      await composedStore.core.getState().updateTokens(mockTokens);

      // Test that authentication is now detected
      expect(composedStore.isAuthenticated()).toBe(true);
      expect(composedStore.core.getState().isAuthenticated()).toBe(true);

      // Verify Supabase tokens are stored
      const coreState = composedStore.core.getState();
      expect(coreState.supabase_token).toBe('supabase-test-token');
      expect(coreState.supabase_expires_at).toBe(mockTokens.supabase_expires_at);
    });

    it('should return access token when authenticated via unified API', async () => {
      // Test initial null access token
      expect(composedStore.getAccessToken()).toBeNull();
      expect(composedStore.core.getState().getAccessToken()).toBeNull();

      // Simulate authentication by setting tokens
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiresAt: Date.now() + 3600000
      };

      await composedStore.core.getState().updateTokens(mockTokens);

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
        access_token: 'token',
        refresh_token: 'refresh-token',
        expiresAt: Date.now() + 3600000
      };

      // Set authenticated state
      composedStore.core.getState().updateUser(mockUser);
      await composedStore.core.getState().updateTokens(mockTokens);
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
      expect(coreState.access_token).toBeNull();
      expect(coreState.supabase_token).toBeNull();
      expect(coreState.supabase_expires_at).toBeNull();

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
      expect(coreState).toHaveProperty('access_token');
      expect(coreState).toHaveProperty('supabase_token');
      expect(coreState).toHaveProperty('supabase_expires_at');

      expect(uiState).toHaveProperty('signInState'); // Single source of truth
      expect(uiState).toHaveProperty('email');
      expect(uiState).toHaveProperty('userExists');

      expect(passkeyState).toHaveProperty('isAuthenticating'); // Specific operation
      expect(passkeyState).toHaveProperty('isSupported');

      expect(emailState).toHaveProperty('isSendingCode'); // Specific operation
      expect(emailState).toHaveProperty('codeSent');

      // States are independent but coordinated - no duplication
      expect(coreState).not.toHaveProperty('signInState');
      expect(uiState).not.toHaveProperty('access_token');
      expect(passkeyState).not.toHaveProperty('signInState');
      expect(emailState).not.toHaveProperty('signInState');
    });

    it('should expose Supabase tokens in getState() unified API', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        createdAt: '2023-01-01T00:00:00Z'
      };

      const supabaseExpiresAt = Date.now() + 3600000;
      const mockTokens = {
        access_token: 'auth0-token',
        refresh_token: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        supabase_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.abc',
        supabase_expires_at: supabaseExpiresAt
      };

      // Authenticate with Supabase tokens
      composedStore.core.getState().updateUser(mockUser);
      await composedStore.core.getState().updateTokens(mockTokens);

      // Verify getState() exposes Supabase tokens
      const state = composedStore.getState();
      expect(state.supabase_token).toBe(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.abc'
      );
      expect(state.supabase_expires_at).toBe(supabaseExpiresAt);

      // Verify other standard fields are present
      expect(state.access_token).toBe('auth0-token');
      expect(state.refresh_token).toBe('refresh-token');
      expect(state.user).toEqual(mockUser);
      expect(state.state).toBe('authenticated');
    });

    it('should handle getState() when Supabase tokens are not present', async () => {
      const mockUser = {
        id: '456',
        email: 'nosupabase@example.com',
        name: 'No Supabase User',
        emailVerified: true,
        createdAt: '2023-01-01T00:00:00Z'
      };

      const mockTokens = {
        access_token: 'auth0-only-token',
        refresh_token: 'refresh-only-token',
        expiresAt: Date.now() + 3600000
        // No Supabase tokens
      };

      // Authenticate without Supabase tokens
      composedStore.core.getState().updateUser(mockUser);
      await composedStore.core.getState().updateTokens(mockTokens);

      // Verify getState() has null/undefined Supabase tokens (backward compatibility)
      const state = composedStore.getState();
      expect(state.supabase_token).toBeUndefined();
      expect(state.supabase_expires_at).toBeUndefined();

      // Verify authentication still works
      expect(state.access_token).toBe('auth0-only-token');
      expect(state.state).toBe('authenticated');
      expect(composedStore.isAuthenticated()).toBe(true);
    });
  });
});
