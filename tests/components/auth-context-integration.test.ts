/**
 * Auth Context Integration Tests
 * 
 * Tests the complete integration of auth store context sharing between
 * SignInForm and SignInCore, ensuring single source of truth and proper
 * state synchronization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import SignInForm from '../../src/components/SignInForm.svelte';
import SignInCore from '../../src/components/core/SignInCore.svelte';
import { AUTH_CONTEXT_KEY } from '../../src/constants/context-keys';
import type { AuthConfig, CompleteAuthStore } from '../../src/types';

// Mock dependencies
vi.mock('../../src/utils/webauthn', () => ({
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false)),
  isWebAuthnSupported: vi.fn(() => false)
}));

const mockI18n = vi.fn((key: string) => key);
const i18nStore = writable(mockI18n);

vi.mock('../../src/utils/i18n', () => ({
  getI18n: vi.fn(() => ({
    t: i18nStore,
    setLanguage: vi.fn(),
    setTranslations: vi.fn()
  }))
}));

describe('Auth Context Integration', () => {
  const mockAuthConfig: AuthConfig = {
    apiBaseUrl: 'https://api.test.com',
    clientId: 'test-client',
    domain: 'test.com',
    enablePasskeys: true,
    enableMagicLinks: true,
    appCode: 'test-app',
    branding: {
      logoUrl: 'https://example.com/logo.png',
      companyName: 'Test Company'
    }
  };

  let mockAuthStore: Partial<CompleteAuthStore>;
  let authStoreSubscribers: Array<(state: any) => void> = [];

  function createMockAuthStore(): Partial<CompleteAuthStore> {
    const storeState = writable({
      state: 'unauthenticated',
      signInState: 'emailEntry',
      user: null,
      error: null,
      loading: false
    });

    return {
      ...storeState,
      getConfig: vi.fn(() => mockAuthConfig),
      subscribe: vi.fn((callback) => {
        authStoreSubscribers.push(callback);
        // Call immediately with initial state
        callback({
          state: 'unauthenticated',
          signInState: 'emailEntry',
          user: null,
          error: null
        });
        return vi.fn(() => {
          // Unsubscribe
          const index = authStoreSubscribers.indexOf(callback);
          if (index > -1) authStoreSubscribers.splice(index, 1);
        });
      }),
      signInWithMagicLink: vi.fn(),
      signInWithPasskey: vi.fn(),
      signOut: vi.fn(),
      sendSignInEvent: vi.fn(),
      checkUser: vi.fn(),
      sendEmailCode: vi.fn(),
      verifyEmailCode: vi.fn()
    };
  }

  beforeEach(() => {
    authStoreSubscribers = [];
    mockAuthStore = createMockAuthStore();
    vi.clearAllMocks();
  });

  describe('Single Source of Truth', () => {
    it('should demonstrate that SignInCore gets auth store from context', () => {
      // Test that SignInCore properly gets and uses auth store from context
      // This validates the clean architecture where SignInCore doesn't accept config props
      
      render(SignInCore, {
        props: {
          initialEmail: 'test@example.com'
        },
        context: new Map([[AUTH_CONTEXT_KEY, writable(mockAuthStore)]])
      });

      // SignInCore should get config from context store
      expect(mockAuthStore.getConfig).toHaveBeenCalled();
      
      // SignInCore should subscribe to store updates
      expect(mockAuthStore.subscribe).toHaveBeenCalled();
      
      // Should not show loading state when store and config are available
      expect(screen.queryByText('Waiting for authentication context...')).not.toBeInTheDocument();
    });

    it('should demonstrate SignInForm uses context for logo display only', () => {
      // SignInForm should only use context for logo display, not auth logic
      
      const { container } = render(SignInForm, {
        props: {
          showLogo: true,
          variant: 'popup',
          size: 'large',
          initialEmail: 'test@example.com'
        },
        context: new Map([[AUTH_CONTEXT_KEY, writable(mockAuthStore)]])
      });

      // SignInForm should handle presentation concerns
      expect(container.querySelector('.auth-form--popup')).toBeInTheDocument();
      expect(container.querySelector('.auth-form--large')).toBeInTheDocument();
      
      // SignInCore should be rendered inside for logic
      expect(container.querySelector('.sign-in-core')).toBeInTheDocument();
      
      // Auth store should be accessed for logo display
      expect(mockAuthStore.getConfig).toHaveBeenCalled();
    });
  });

  describe('Context Key Consistency', () => {
    it('should use the same AUTH_CONTEXT_KEY constant across components', () => {
      // This test verifies that both components use the same key
      expect(AUTH_CONTEXT_KEY).toBe('flows-auth-store');
      
      // Both components should work with the same context key
      const { unmount: unmount1 } = render(SignInForm, {
        props: { initialEmail: 'test@example.com' },
        context: new Map([[AUTH_CONTEXT_KEY, writable(mockAuthStore)]])
      });
      
      const { unmount: unmount2 } = render(SignInCore, {
        props: { initialEmail: 'test@example.com' },
        context: new Map([[AUTH_CONTEXT_KEY, writable(mockAuthStore)]])
      });

      expect(mockAuthStore.getConfig).toHaveBeenCalled();
      
      unmount1();
      unmount2();
    });

    it('should fail gracefully when context key mismatch occurs', () => {
      // Test that SignInCore shows loading state when context is missing
      render(SignInCore, {
        props: {
          initialEmail: 'test@example.com'
        }
        // No context provided - simulates context key mismatch
      });

      // SignInCore should show waiting message when it can't find context
      expect(screen.getByText('Waiting for authentication context...')).toBeInTheDocument();
    });
  });

  describe('State Synchronization', () => {
    it('should set up subscription when auth store is available', () => {
      render(SignInCore, {
        props: {
          initialEmail: 'test@example.com'
        },
        context: new Map([[AUTH_CONTEXT_KEY, writable(mockAuthStore)]])
      });

      // Verify subscription is set up
      expect(mockAuthStore.subscribe).toHaveBeenCalled();
      expect(authStoreSubscribers).toHaveLength(1);
    });

    it('should handle multiple subscribers correctly (future extensibility)', () => {
      // Test that multiple SignInCore instances can subscribe to the same store
      
      const { unmount: unmount1 } = render(SignInCore, {
        props: { initialEmail: 'test1@example.com' },
        context: new Map([[AUTH_CONTEXT_KEY, writable(mockAuthStore)]])
      });
      
      const { unmount: unmount2 } = render(SignInCore, {
        props: { initialEmail: 'test2@example.com' },
        context: new Map([[AUTH_CONTEXT_KEY, writable(mockAuthStore)]])
      });

      // Should handle multiple subscriptions
      expect(mockAuthStore.subscribe).toHaveBeenCalledTimes(2);
      expect(authStoreSubscribers).toHaveLength(2);
      
      unmount1();
      unmount2();
    });
  });

  describe('Reactive Context Updates', () => {
    it('should handle missing auth store gracefully', () => {
      // Test reactive pattern with null store initially
      const authStoreContext = writable(null);
      
      render(SignInCore, {
        props: {
          initialEmail: 'test@example.com'
        },
        context: new Map([[AUTH_CONTEXT_KEY, authStoreContext]])
      });

      // Initially should show loading state
      expect(screen.getByText('Waiting for authentication context...')).toBeInTheDocument();

      // Store hasn't been accessed yet because it's null
      expect(mockAuthStore.getConfig).not.toHaveBeenCalled();
    });
  });

  describe('Architecture Validation', () => {
    it('should demonstrate proper layered architecture', () => {
      const { container } = render(SignInForm, {
        props: {
          showLogo: true,
          variant: 'inline',
          initialEmail: 'test@example.com'
        },
        context: new Map([[AUTH_CONTEXT_KEY, writable(mockAuthStore)]])
      });

      // Architecture validation:
      // 1. SignInForm handles presentation
      // 2. SignInCore handles logic (rendered inside SignInForm)
      // 3. Both use same auth store from context

      // SignInForm presentation layer
      expect(container.querySelector('.auth-form--inline')).toBeInTheDocument();
      expect(container.querySelector('.auth-container')).toBeInTheDocument();
      
      // SignInCore logic layer
      expect(container.querySelector('.sign-in-core')).toBeInTheDocument();
      
      // Auth store accessed by both layers
      expect(mockAuthStore.getConfig).toHaveBeenCalled();
    });

    it('should prevent component isolation by using shared context', () => {
      // Test that components use shared context store, not isolated instances
      
      render(SignInCore, {
        props: {
          initialEmail: 'test@example.com'
        },
        context: new Map([[AUTH_CONTEXT_KEY, writable(mockAuthStore)]])
      });

      // Verify that component uses shared context store
      expect(mockAuthStore.getConfig).toHaveBeenCalled();
      expect(mockAuthStore.subscribe).toHaveBeenCalled();
      
      // Component successfully renders without creating its own store
      expect(screen.queryByText('Waiting for authentication context...')).not.toBeInTheDocument();
    });
  });
});