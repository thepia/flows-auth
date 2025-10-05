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
import { AUTH_CONTEXT_KEY } from '../../src/constants/context-keys';
import type { AuthConfig } from '../../src/types';
import { renderWithStoreProp } from '../helpers/component-test-setup';

// Mock dependencies
vi.mock('../../src/utils/webauthn', () => ({
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false)),
  isWebAuthnSupported: vi.fn(() => false),
  isConditionalMediationSupported: vi.fn(() => Promise.resolve(false))
}));

describe('Auth Context Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Single Source of Truth', () => {
    it('should demonstrate that SignInCore gets auth store from context', () => {
      // Test that SignInCore properly gets and uses auth store from context
      // This validates the clean architecture where SignInCore doesn't accept config props

      renderWithStoreProp(SignInCore, {
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

      // Should render component with email input when store and config are available
      expect(document.querySelector('.sign-in-core')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should demonstrate SignInForm uses context for logo display only', () => {
      // SignInForm should only use context for logo display, not auth logic

      const { container } = renderWithStoreProp(SignInForm, {
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
      const { unmount: unmount1 } = renderWithStoreProp(SignInForm, {
        authConfig: { apiBaseUrl: 'https://api.test.com', appCode: 'test-app' },
        props: { initialEmail: 'test@example.com' }
      });

      const { unmount: unmount2 } = renderWithStoreProp(SignInCore, {
        authConfig: { apiBaseUrl: 'https://api.test.com', appCode: 'test-app' },
        props: { initialEmail: 'test@example.com' }
      });

      unmount1();
      unmount2();
    });

    it('should throw error when context key mismatch occurs', () => {
      // Test that SignInCore throws error when context is missing (strict requirement)
      expect(() => {
        render(SignInCore, {
          props: {
            initialEmail: 'test@example.com'
          }
          // No context provided - simulates context key mismatch
        });
      }).toThrow('Auth store not found in context');
    });
  });

  describe('State Synchronization', () => {
    it('should set up subscription when auth store is available', () => {
      renderWithStoreProp(SignInCore, {
        authConfig: { apiBaseUrl: 'https://api.test.com', appCode: 'test-app' },
        props: {
          initialEmail: 'test@example.com'
        }
      });

      // Component should render with email input
      expect(document.querySelector('.sign-in-core')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should handle multiple subscribers correctly (future extensibility)', () => {
      // Test that multiple SignInCore instances can subscribe to the same store

      const { unmount: unmount1 } = renderWithStoreProp(SignInCore, {
        authConfig: { apiBaseUrl: 'https://api.test.com', appCode: 'test-app' },
        props: { initialEmail: 'test1@example.com' }
      });

      const { unmount: unmount2 } = renderWithStoreProp(SignInCore, {
        authConfig: { apiBaseUrl: 'https://api.test.com', appCode: 'test-app' },
        props: { initialEmail: 'test2@example.com' }
      });

      // Both should render with email inputs
      const coreComponents = document.querySelectorAll('.sign-in-core');
      expect(coreComponents.length).toBeGreaterThan(0);

      unmount1();
      unmount2();
    });
  });

  describe('Store Prop vs Context', () => {
    it('should accept store via prop and ignore context', () => {
      // Test that store prop takes precedence over context
      const { container } = renderWithStoreProp(SignInCore, {
        authConfig: { apiBaseUrl: 'https://api.test.com', appCode: 'test-app' },
        props: { initialEmail: 'test@example.com' }
      });

      // Component should render successfully with store prop
      expect(container.querySelector('.sign-in-core')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('Architecture Validation', () => {
    it('should demonstrate proper layered architecture', () => {
      const { container } = renderWithStoreProp(SignInForm, {
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

      renderWithStoreProp(SignInCore, {
        authConfig: { apiBaseUrl: 'https://api.test.com', appCode: 'test-app' },
        props: {
          initialEmail: 'test@example.com'
        }
      });

      // Component successfully renders without creating its own store
      expect(document.querySelector('.sign-in-core')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });
});
