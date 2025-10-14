/**
 * New Modular Auth Store Tests
 *
 * Tests the new Zustand-based modular auth store architecture.
 * This replaces the monolithic auth-store tests with focused,
 * modular tests that test each store individually and composed.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores';
import { createEmailAuthStore } from '../../src/stores/auth-methods/email-auth';
import { createPasskeyStore } from '../../src/stores/auth-methods/passkey';
import { createAuthCoreStore } from '../../src/stores/core/auth-core';
import { createUIStore, signInStateTransitions } from '../../src/stores/ui/ui-state';
import type { AuthConfig } from '../../src/types';

// Mock external dependencies
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

// Mock WebAuthn APIs
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
  getOptimalSessionConfig: vi.fn(() => ({ type: 'sessionStorage' }))
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

// Mock browser environment
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

describe('New Modular Auth Store Architecture', () => {
  describe('Individual Store Tests', () => {
    describe('Auth Core Store', () => {
      let authCore: ReturnType<typeof createAuthCoreStore>;

      beforeEach(() => {
        authCore = createAuthCoreStore({ config: mockConfig });
      });

      it('should initialize with unauthenticated state', () => {
        const state = authCore.getState();

        expect(state.state).toBe('unauthenticated');
        expect(state.user).toBeNull();
        expect(state.access_token).toBeNull();
        expect(state.refresh_token).toBeNull();
      });

      it('should update authentication state', async () => {
        const mockUser = {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: new Date().toISOString()
        };

        authCore.getState().updateUser(mockUser);
        await authCore.getState().updateTokens({
          access_token: 'token123',
          refresh_token: 'refresh123',
          expiresAt: Date.now() + 3600000
        });

        const state = authCore.getState();
        expect(state.state).toBe('authenticated');
        expect(state.user).toEqual(mockUser);
        expect(state.access_token).toBe('token123');
        expect(state.isAuthenticated()).toBe(true);
      });
    });

    describe('UI Store - Single signInState', () => {
      let uiStore: ReturnType<typeof createUIStore>;

      beforeEach(() => {
        uiStore = createUIStore({ config: mockConfig });
      });

      it('should initialize with emailEntry state', () => {
        const state = uiStore.getState();

        expect(state.signInState).toBe('emailEntry');
        expect(state.email).toBe('');
        expect(state.userExists).toBeNull();
        expect(state.hasPasskeys).toBe(false);
      });

      it('should manage single signInState transitions', () => {
        const { setSignInState } = uiStore.getState();

        // Test state transitions
        setSignInState('userChecked');
        expect(uiStore.getState().signInState).toBe('userChecked');

        setSignInState('pinEntry');
        expect(uiStore.getState().signInState).toBe('pinEntry');

        setSignInState('signedIn');
        expect(uiStore.getState().signInState).toBe('signedIn');
      });

      it('should use state transition helpers', () => {
        // Test user discovery transition
        signInStateTransitions.userDiscovered(uiStore, {
          exists: true,
          hasPasskeys: true,
          hasValidPin: false,
          pinRemainingMinutes: 0
        });

        const state = uiStore.getState();
        expect(state.signInState).toBe('userChecked');
        expect(state.userExists).toBe(true);
        expect(state.hasPasskeys).toBe(true);

        // Test email code sent transition
        signInStateTransitions.emailCodeSent(uiStore);
        expect(uiStore.getState().signInState).toBe('pinEntry');

        // Test authentication success
        signInStateTransitions.authenticationSuccess(uiStore);
        expect(uiStore.getState().signInState).toBe('signedIn');
      });

      it('should reset UI state properly', () => {
        // Set some state
        const { setEmail, setFullName, setSignInState } = uiStore.getState();
        setEmail('test@example.com');
        setFullName('Test User');
        setSignInState('userChecked');

        // Reset
        signInStateTransitions.reset(uiStore);

        const state = uiStore.getState();
        expect(state.signInState).toBe('emailEntry');
        expect(state.email).toBe('');
        expect(state.fullName).toBe('');
        expect(state.userExists).toBeNull();
      });
    });

    describe('Passkey Store', () => {
      let passkeyStore: ReturnType<typeof createPasskeyStore>;

      beforeEach(async () => {
        passkeyStore = createPasskeyStore({ config: mockConfig });
        // Wait for async capability detection to complete
        await passkeyStore.getState().checkCapabilities();
      });

      it('should initialize with passkey capabilities', () => {
        const state = passkeyStore.getState();

        expect(state.isSupported).toBe(true); // Mocked to true
        expect(state.isAuthenticating).toBe(false);
        expect(state.isRegistering).toBe(false);
        expect(state.conditionalActive).toBe(false);
      });

      it('should manage passkey-specific state', () => {
        const { setAuthenticating, setRegistering, setConditionalActive } = passkeyStore.getState();

        setAuthenticating(true);
        expect(passkeyStore.getState().isAuthenticating).toBe(true);

        setRegistering(true);
        expect(passkeyStore.getState().isRegistering).toBe(true);

        setConditionalActive(true);
        expect(passkeyStore.getState().conditionalActive).toBe(true);
      });
    });

    describe('Email Auth Store', () => {
      let emailStore: ReturnType<typeof createEmailAuthStore>;

      beforeEach(() => {
        emailStore = createEmailAuthStore({ config: mockConfig });
      });

      it('should initialize with email auth state', () => {
        const state = emailStore.getState();

        expect(state.isSendingCode).toBe(false);
        expect(state.isVerifyingCode).toBe(false);
        expect(state.codeSent).toBe(false);
        expect(state.canResendCode).toBe(true);
        expect(state.resendAttempts).toBe(0);
      });

      it('should manage email-specific state', () => {
        const { setCodeSent, startResendCooldown } = emailStore.getState();

        setCodeSent(true);
        expect(emailStore.getState().codeSent).toBe(true);

        startResendCooldown(10);
        expect(emailStore.getState().canResendCode).toBe(false);
        expect(emailStore.getState().resendCooldownSeconds).toBe(10);
      });
    });
  });

  describe('Composed Store Tests', () => {
    let composedStore: ReturnType<typeof createAuthStore>;

    beforeEach(() => {
      vi.clearAllMocks();
      localStorage.clear();
      sessionStorage.clear();
      composedStore = createAuthStore(mockConfig);
    });

    afterEach(() => {
      composedStore.destroy();
    });

    it('should create all individual stores', () => {
      expect(composedStore.core).toBeDefined();
      expect(composedStore.session).toBeDefined();
      expect(composedStore.error).toBeDefined();
      expect(composedStore.events).toBeDefined();
      expect(composedStore.passkey).toBeDefined();
      expect(composedStore.email).toBeDefined();
      expect(composedStore.ui).toBeDefined();
    });

    it('should provide unified API', () => {
      expect(composedStore.signInWithPasskey).toBeInstanceOf(Function);
      expect(composedStore.signInWithMagicLink).toBeInstanceOf(Function);
      expect(composedStore.sendEmailCode).toBeInstanceOf(Function);
      expect(composedStore.verifyEmailCode).toBeInstanceOf(Function);
      expect(composedStore.checkUser).toBeInstanceOf(Function);
      expect(composedStore.setEmail).toBeInstanceOf(Function);
      expect(composedStore.setFullName).toBeInstanceOf(Function);
      expect(composedStore.isAuthenticated).toBeInstanceOf(Function);
    });

    it('should demonstrate single signInState coordination', () => {
      // Initially emailEntry
      expect(composedStore.ui.getState().signInState).toBe('emailEntry');
      expect(composedStore.passkey.getState().isAuthenticating).toBe(false);
      expect(composedStore.email.getState().isSendingCode).toBe(false);

      // Simulate user discovery
      composedStore.setEmail('test@example.com');
      expect(composedStore.ui.getState().email).toBe('test@example.com');

      // Simulate passkey authentication start
      composedStore.passkey.getState().setAuthenticating(true);
      expect(composedStore.passkey.getState().isAuthenticating).toBe(true);
      // UI state remains independent
      expect(composedStore.ui.getState().signInState).toBe('emailEntry');

      // Transition UI state
      composedStore.ui.getState().setSignInState('userChecked');
      expect(composedStore.ui.getState().signInState).toBe('userChecked');
      // Passkey state remains independent
      expect(composedStore.passkey.getState().isAuthenticating).toBe(true);
    });

    it('should handle cross-store events', (done) => {
      // Listen for sign-in success event
      const unsubscribe = composedStore.on('sign_in_success', (data) => {
        expect(data.method).toBe('passkey');
        expect(data.user).toBeDefined();
        unsubscribe();
        done();
      });

      // Emit sign-in success event (through events store)
      composedStore.events.getState().emit('sign_in_success', {
        method: 'passkey',
        user: {
          id: '123',
          email: 'test@example.com',
          emailVerified: true,
          createdAt: new Date().toISOString()
        }
      });
    });

    it('should maintain state separation and composition', () => {
      // Each store manages its own specific state
      const coreState = composedStore.core.getState();
      const uiState = composedStore.ui.getState();
      const passkeyState = composedStore.passkey.getState();
      const emailState = composedStore.email.getState();

      // Verify state structure
      expect(coreState).toHaveProperty('state');
      expect(coreState).toHaveProperty('user');
      expect(coreState).toHaveProperty('access_token');

      expect(uiState).toHaveProperty('signInState'); // Single source of truth
      expect(uiState).toHaveProperty('email');
      expect(uiState).toHaveProperty('userExists');

      expect(passkeyState).toHaveProperty('isAuthenticating'); // Specific operation
      expect(passkeyState).toHaveProperty('isSupported');

      expect(emailState).toHaveProperty('isSendingCode'); // Specific operation
      expect(emailState).toHaveProperty('codeSent');

      // States are independent but coordinated
      expect(coreState).not.toHaveProperty('signInState');
      expect(uiState).not.toHaveProperty('access_token');
      expect(passkeyState).not.toHaveProperty('signInState');
      expect(emailState).not.toHaveProperty('signInState');
    });

    it('should cleanup properly on destroy', () => {
      // Set some state
      composedStore.ui.getState().setEmail('test@example.com');
      composedStore.ui.getState().setSignInState('userChecked');
      composedStore.passkey.getState().setAuthenticating(true);

      // Destroy
      composedStore.destroy();

      // Verify cleanup
      expect(composedStore.ui.getState().signInState).toBe('emailEntry');
      expect(composedStore.ui.getState().email).toBe('');
      expect(composedStore.passkey.getState().isAuthenticating).toBe(false);
      expect(composedStore.core.getState().state).toBe('unauthenticated');
    });
  });

  describe('Migration Compatibility', () => {
    let composedStore: ReturnType<typeof createAuthStore>;

    beforeEach(() => {
      composedStore = createAuthStore(mockConfig);
    });

    afterEach(() => {
      composedStore.destroy();
    });

    it('should provide backward-compatible API', () => {
      // Test that the new store provides similar API to old store
      expect(composedStore.isAuthenticated()).toBe(false);
      expect(composedStore.getAccessToken()).toBeNull();

      // Test state management
      composedStore.setEmail('test@example.com');
      composedStore.setFullName('Test User');

      // These should work just like the old store
      expect(composedStore.ui.getState().email).toBe('test@example.com');
      expect(composedStore.ui.getState().fullName).toBe('Test User');
    });

    it('should demonstrate improved architecture benefits', () => {
      // 1. Modularity - can access specific stores
      expect(composedStore.core).toBeDefined();
      expect(composedStore.passkey).toBeDefined();
      expect(composedStore.email).toBeDefined();

      // 2. Single signInState - no duplication
      const signInStates = [
        composedStore.core.getState(),
        composedStore.passkey.getState(),
        composedStore.email.getState()
      ];

      // Only UI store should have signInState
      const hasSignInState = signInStates.map((state) => 'signInState' in state);
      expect(hasSignInState).toEqual([false, false, false]);
      expect(composedStore.ui.getState()).toHaveProperty('signInState');

      // 4. Clear separation of concerns
      expect(composedStore.passkey.getState()).toHaveProperty('isAuthenticating');
      expect(composedStore.email.getState()).toHaveProperty('isSendingCode');
      expect(composedStore.ui.getState()).toHaveProperty('signInState');

      // None should have each other's specific properties
      expect(composedStore.passkey.getState()).not.toHaveProperty('isSendingCode');
      expect(composedStore.email.getState()).not.toHaveProperty('isAuthenticating');
    });
  });
});
