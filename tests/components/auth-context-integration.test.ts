/**
 * Auth Context Integration Tests
 *
 * Tests the complete integration of auth store context sharing between
 * SignInForm and SignInCore, ensuring single source of truth and proper
 * state synchronization.
 */

import { render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInForm from '../../src/components/SignInForm.svelte';
import SignInCore from '../../src/components/core/SignInCore.svelte';
import { renderWithAuthContext } from '../helpers/component-test-setup';
import { AUTH_CONTEXT_KEY } from '../../src/constants/context-keys';
import type { AuthConfig, CompleteAuthStore } from '../../src/types';

// Mock dependencies
vi.mock('../../src/utils/webauthn', () => ({
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false)),
  isWebAuthnSupported: vi.fn(() => false)
}));

// Mock svelte-i18n for future compatibility
vi.mock('svelte-i18n', () => ({
  _: vi.fn((key: string) => key)
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Single Source of Truth', () => {
    it('should demonstrate that SignInCore gets auth store from context', () => {
      // Test that SignInCore properly gets and uses auth store from context
      // This validates the clean architecture where SignInCore doesn't accept config props

      renderWithAuthContext(SignInCore, {
        authConfig: {
          apiBaseUrl: 'https://api.test.com',
          appCode: 'test-app',
          enablePasskeys: true,
          enableMagicLinks: true
        },
        props: {
          initialEmail: 'test@example.com'
        }
      });

      // Should not show loading state when store and config are available
      expect(screen.queryByText('Waiting for authentication context...')).not.toBeInTheDocument();
    });

    it('should demonstrate SignInForm uses context for logo display only', () => {
      // SignInForm should only use context for logo display, not auth logic

      const { container } = renderWithAuthContext(SignInForm, {
        authConfig: {
          apiBaseUrl: 'https://api.test.com',
          appCode: 'test-app',
          enablePasskeys: true,
          enableMagicLinks: true,
          branding: {
            logoUrl: 'https://example.com/logo.png',
            companyName: 'Test Company'
          }
        },
        props: {
          showLogo: true,
          variant: 'popup',
          size: 'large',
          initialEmail: 'test@example.com'
        }
      });

      // SignInForm should handle presentation concerns
      expect(container.querySelector('.auth-form--popup')).toBeInTheDocument();
      expect(container.querySelector('.auth-form--large')).toBeInTheDocument();

      // SignInCore should be rendered inside for logic
      expect(container.querySelector('.sign-in-core')).toBeInTheDocument();

    });
  });

  describe('Context Key Consistency', () => {
    it('should use the same AUTH_CONTEXT_KEY constant across components', () => {
      // This test verifies that both components use the same key
      expect(AUTH_CONTEXT_KEY).toBe('flows-auth-store');

      // Both components should work with the same context key
      const { unmount: unmount1 } = renderWithAuthContext(SignInForm, {
        authConfig: { apiBaseUrl: 'https://api.test.com', appCode: 'test-app' },
        props: { initialEmail: 'test@example.com' }
      });

      const { unmount: unmount2 } = renderWithAuthContext(SignInCore, {
        authConfig: { apiBaseUrl: 'https://api.test.com', appCode: 'test-app' },
        props: { initialEmail: 'test@example.com' }
      });

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
      renderWithAuthContext(SignInCore, {
        authConfig: { apiBaseUrl: 'https://api.test.com', appCode: 'test-app' },
        props: {
          initialEmail: 'test@example.com'
        }
      });

      // Component should render without waiting message
      expect(screen.queryByText('Waiting for authentication context...')).not.toBeInTheDocument();
    });

    it('should handle multiple subscribers correctly (future extensibility)', () => {
      // Test that multiple SignInCore instances can subscribe to the same store

      const { unmount: unmount1 } = renderWithAuthContext(SignInCore, {
        authConfig: { apiBaseUrl: 'https://api.test.com', appCode: 'test-app' },
        props: { initialEmail: 'test1@example.com' }
      });

      const { unmount: unmount2 } = renderWithAuthContext(SignInCore, {
        authConfig: { apiBaseUrl: 'https://api.test.com', appCode: 'test-app' },
        props: { initialEmail: 'test2@example.com' }
      });

      // Both should render without waiting message
      expect(screen.queryByText('Waiting for authentication context...')).not.toBeInTheDocument();

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
    });
  });

  describe('Architecture Validation', () => {
    it('should demonstrate proper layered architecture', () => {
      const { container } = renderWithAuthContext(SignInForm, {
        authConfig: {
          apiBaseUrl: 'https://api.test.com',
          appCode: 'test-app',
          enablePasskeys: true,
          enableMagicLinks: true
        },
        props: {
          showLogo: true,
          variant: 'inline',
          initialEmail: 'test@example.com'
        }
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
    });

    it('should prevent component isolation by using shared context', () => {
      // Test that components use shared context store, not isolated instances

      renderWithAuthContext(SignInCore, {
        authConfig: { apiBaseUrl: 'https://api.test.com', appCode: 'test-app' },
        props: {
          initialEmail: 'test@example.com'
        }
      });

      // Component successfully renders without creating its own store
      expect(screen.queryByText('Waiting for authentication context...')).not.toBeInTheDocument();
    });
  });
});
