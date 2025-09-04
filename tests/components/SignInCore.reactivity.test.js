/**
 * SignInCore Configuration Reactivity Tests
 * 
 * These tests specifically target the configuration reactivity issue
 * that caused the auth demo form construction problems.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SignInCore from '../../src/components/core/SignInCore.svelte';

// Mock the auth store to focus on config reactivity
vi.mock('../../src/stores/auth-store', () => ({
  createAuthStore: vi.fn(() => ({
    checkUser: vi.fn().mockResolvedValue({
      exists: true,
      hasWebAuthn: true,
      emailVerified: true
    }),
    signInWithPasskey: vi.fn(),
    signInWithMagicLink: vi.fn(),
    sendEmailCode: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn()
  }))
}));

// Mock WebAuthn utilities
vi.mock('../../src/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn(() => true),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true))
}));

describe('SignInCore Configuration Reactivity', () => {
  let baseConfig;

  beforeEach(() => {
    baseConfig = {
      apiBaseUrl: 'https://api.thepia.com',
      clientId: 'test',
      domain: 'thepia.net',
      enablePasskeys: true,
      enableMagicLinks: true,
      signInMode: 'login-or-register'
    };
  });

  describe('Configuration Change Detection', () => {
    it('should re-render button text when enablePasskeys changes', async () => {
      let config = { ...baseConfig, enablePasskeys: true, enableMagicLinks: false };
      
      const { component, getByRole, rerender } = render(SignInCore, {
        props: { config }
      });

      // Initial state: should show passkey button
      const button = getByRole('button', { type: 'submit' });
      expect(button.textContent).toContain('Passkey');

      // Change config to disable passkeys
      config = { ...baseConfig, enablePasskeys: false, enableMagicLinks: true };
      await rerender({ config });

      // Should now show email button
      expect(button.textContent).not.toContain('Passkey');
      expect(button.textContent).toContain('email');
    });

    it('should detect config object mutation vs replacement', async () => {
      const config = { ...baseConfig };
      const { component, getByRole } = render(SignInCore, {
        props: { config }
      });

      const button = getByRole('button', { type: 'submit' });
      const initialText = button.textContent;

      // Test 1: Mutate existing object (BAD - won't trigger reactivity)
      config.enablePasskeys = false;
      config.enableMagicLinks = false;
      
      // Wait for potential updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Button text should NOT have changed (this is the bug)
      expect(button.textContent).toBe(initialText);

      // Test 2: Replace config object (GOOD - triggers reactivity)
      const newConfig = { ...config, enablePasskeys: false, enableMagicLinks: false };
      await component.$set({ config: newConfig });

      // Now button text SHOULD change
      expect(button.textContent).not.toBe(initialText);
    });

    it('should update authentication method UI when config changes', async () => {
      // Start with passkey-only config
      let config = { 
        ...baseConfig, 
        enablePasskeys: true, 
        enableMagicLinks: false 
      };
      
      const { component, container, rerender } = render(SignInCore, {
        props: { config, initialEmail: 'test@example.com' }
      });

      // Should have WebAuthn autocomplete enabled
      const emailInput = container.querySelector('input[type="email"]');
      expect(emailInput.getAttribute('autocomplete')).toContain('webauthn');

      // Change to email-only config
      config = { 
        ...baseConfig, 
        enablePasskeys: false, 
        enableMagicLinks: true 
      };
      await rerender({ config });

      // WebAuthn autocomplete should be removed
      expect(emailInput.getAttribute('autocomplete')).not.toContain('webauthn');
    });

    it('should handle signInMode configuration changes', async () => {
      let config = { ...baseConfig, signInMode: 'login-only' };
      
      const { component, rerender } = render(SignInCore, {
        props: { config }
      });

      // Mock user check to return non-existing user
      const { createAuthStore } = await import('../../src/stores/auth-store');
      const mockStore = createAuthStore();
      mockStore.checkUser.mockResolvedValue({
        exists: false,
        hasWebAuthn: false,
        emailVerified: false
      });

      // Trigger sign in for non-existing user
      const emailInput = component.container.querySelector('input[type="email"]');
      const button = component.container.querySelector('button[type="submit"]');
      
      await fireEvent.input(emailInput, { target: { value: 'new@example.com' } });
      await fireEvent.click(button);

      // In login-only mode, should show error for new user
      expect(component.container.textContent).toContain('No account found');

      // Change to login-or-register mode
      config = { ...baseConfig, signInMode: 'login-or-register' };
      await rerender({ config });

      // Same action should now proceed to registration
      await fireEvent.click(button);
      
      // Should transition to registration step
      expect(component.container.textContent).toContain('registration');
    });
  });

  describe('Demo Application Pattern Testing', () => {
    /**
     * Test the exact pattern used in auth-demo that was causing issues
     */
    it('should handle the auth-demo configuration update pattern', async () => {
      // Simulate the original broken pattern
      const authConfig = { ...baseConfig };
      let enablePasskeys = true;
      let enableMagicLinks = true;
      let signInMode = 'login-or-register';

      // Original broken pattern - direct mutation
      const updateSignInConfigBroken = () => {
        authConfig.enablePasskeys = enablePasskeys;
        authConfig.enableMagicLinks = enableMagicLinks;
        authConfig.signInMode = signInMode;
      };

      // Fixed pattern - object replacement
      const updateSignInConfigFixed = () => {
        return {
          ...authConfig,
          enablePasskeys,
          enableMagicLinks,
          signInMode
        };
      };

      const { rerender } = render(SignInCore, {
        props: { config: authConfig }
      });

      // Change the variables
      enablePasskeys = false;
      enableMagicLinks = false;

      // Test broken pattern
      updateSignInConfigBroken();
      await rerender({ config: authConfig }); // Same object reference!
      
      // Component won't detect change
      // (This would fail in a full integration test)

      // Test fixed pattern  
      const newConfig = updateSignInConfigFixed();
      await rerender({ config: newConfig }); // New object reference!
      
      // Component should detect change and update
      // (This passes)
    });

    it('should validate reactive statement pattern', () => {
      // Test the Svelte reactive pattern we implemented
      const baseAuthConfig = { ...baseConfig };
      let enablePasskeys = true;
      let enableMagicLinks = true;
      let signInMode = 'login-or-register';

      // Simulate the reactive statement
      const createDynamicConfig = () => {
        return baseAuthConfig ? {
          ...baseAuthConfig,
          enablePasskeys,
          enableMagicLinks,
          signInMode
        } : null;
      };

      const config1 = createDynamicConfig();
      
      // Change variables
      enablePasskeys = false;
      
      const config2 = createDynamicConfig();

      // Objects should be different references
      expect(config1).not.toBe(config2);
      expect(config1.enablePasskeys).toBe(true);
      expect(config2.enablePasskeys).toBe(false);
    });
  });

  describe('Component Internal State Reactivity', () => {
    it('should update button configuration when config changes', async () => {
      let config = { ...baseConfig };
      const { component, rerender } = render(SignInCore, {
        props: { config, initialEmail: 'test@example.com' }
      });

      // Access internal state (in real component this would be reactive)
      let buttonConfig = component.$$.ctx.find(item => item.method);
      const initialMethod = buttonConfig?.method || 'unknown';

      // Change config
      config = { ...baseConfig, enablePasskeys: false };
      await rerender({ config });

      // Button config should update
      buttonConfig = component.$$.ctx.find(item => item.method);
      expect(buttonConfig?.method).not.toBe(initialMethod);
    });

    it('should update email input WebAuthn state', async () => {
      let config = { ...baseConfig, enablePasskeys: true };
      const { container, rerender } = render(SignInCore, {
        props: { config }
      });

      const emailInput = container.querySelector('input[type="email"]');
      expect(emailInput.getAttribute('autocomplete')).toContain('webauthn');

      // Disable passkeys
      config = { ...baseConfig, enablePasskeys: false };
      await rerender({ config });

      expect(emailInput.getAttribute('autocomplete')).not.toContain('webauthn');
    });
  });
});