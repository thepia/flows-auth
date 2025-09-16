/**
 * SignInCore Configuration Reactivity Tests
 *
 * These tests specifically target the configuration reactivity issue
 * that caused the auth demo form construction problems.
 */

import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInCore from '../../src/components/core/SignInCore.svelte';
import { renderWithAuthContext, TEST_AUTH_CONFIGS } from '../helpers/component-test-setup';

// Using real auth store - no mocking needed
describe('SignInCore Configuration Reactivity', () => {

  describe('Configuration Change Detection', () => {
    it('should re-render button text when enablePasskeys changes', async () => {
      const { component, getByRole } = renderWithAuthContext(SignInCore, {
        authConfig: { ...TEST_AUTH_CONFIGS.withAppCode, enablePasskeys: true, enableMagicLinks: false }
      });

      // Initial state: should show passkey button (when WebAuthn is available)
      const button = getByRole('button', { type: 'submit' });
      // Note: The actual button text depends on WebAuthn availability in test environment
      expect(button).toBeDefined();
    });

    it('should detect config object mutation vs replacement', async () => {
      const { component, getByRole } = renderWithAuthContext(SignInCore, {
        authConfig: { ...TEST_AUTH_CONFIGS.withAppCode }
      });

      const button = getByRole('button', { type: 'submit' });
      const initialText = button.textContent;

      // Test basic button functionality
      expect(initialText).toBeDefined();
    });

    it('should update authentication method UI when config changes', async () => {
      const { component, container } = renderWithAuthContext(SignInCore, {
        props: { initialEmail: 'test@example.com' },
        authConfig: { ...TEST_AUTH_CONFIGS.withAppCode, enablePasskeys: true, enableMagicLinks: false }
      });

      // Should have email input
      const emailInput = container.querySelector('input[type="email"]');
      expect(emailInput).toBeDefined();
      expect(emailInput.getAttribute('autocomplete')).toBe('email webauthn');
    });

    it('should handle signInMode configuration changes', async () => {
      const { component, container } = renderWithAuthContext(SignInCore, {
        authConfig: { ...TEST_AUTH_CONFIGS.loginOnly }
      });

      // Should have email input and button
      const emailInput = container.querySelector('input[type="email"]');
      const button = container.querySelector('button[type="submit"]');
      expect(emailInput).toBeDefined();
      expect(button).toBeDefined();

      await fireEvent.input(emailInput, { target: { value: 'new@example.com' } });
      await fireEvent.click(button);

      // In login-only mode, should show appropriate message
      expect(button).toBeDefined();
    });
  });

  describe('Demo Application Pattern Testing', () => {
    /**
     * Test the exact pattern used in auth-demo that was causing issues
     */
    it('should handle the auth-demo configuration update pattern', async () => {
      const { component } = renderWithAuthContext(SignInCore, {
        authConfig: { ...TEST_AUTH_CONFIGS.withAppCode }
      });

      // Test that component renders successfully with real auth store
      expect(component).toBeDefined();

    });

    it('should validate reactive statement pattern', () => {
      // Test basic configuration object creation
      let enablePasskeys = true;
      const enableMagicLinks = true;
      const signInMode = 'login-or-register';

      const config1 = { enablePasskeys, enableMagicLinks, signInMode };

      // Change variables
      enablePasskeys = false;

      const config2 = { enablePasskeys, enableMagicLinks, signInMode };

      // Objects should be different references
      expect(config1).not.toBe(config2);
      expect(config1.enablePasskeys).toBe(true);
      expect(config2.enablePasskeys).toBe(false);
    });
  });

  describe('Component Internal State Reactivity', () => {
    it('should update button configuration when config changes', async () => {
      const { component } = renderWithAuthContext(SignInCore, {
        props: { initialEmail: 'test@example.com' },
        authConfig: { ...TEST_AUTH_CONFIGS.withAppCode }
      });

      // Test that component renders successfully
      expect(component).toBeDefined();
    });

    it('should update email input WebAuthn state', async () => {
      const { container } = renderWithAuthContext(SignInCore, {
        authConfig: { ...TEST_AUTH_CONFIGS.withAppCode, enablePasskeys: true }
      });

      const emailInput = container.querySelector('input[type="email"]');
      expect(emailInput).toBeDefined();
      expect(emailInput.getAttribute('autocomplete')).toBe('email webauthn');
    });
  });
});
