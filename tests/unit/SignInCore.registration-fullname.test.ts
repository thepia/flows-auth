import { fireEvent, waitFor } from '@testing-library/svelte';
/**
 * Tests for SignInCore registration flow with fullName validation
 * Ensures sign-in button is properly disabled when fullName is invalid for new users
 */
import { describe, expect, it, vi } from 'vitest';
import SignInCore from '../../src/components/core/SignInCore.svelte';
import { renderWithAuthContext, TEST_AUTH_CONFIGS } from '../helpers/component-test-setup';

// Mock WebAuthn utilities
vi.mock('../../src/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn(() => false),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false))
}));

describe('SignInCore - Registration with FullName Validation', () => {
  describe('New user registration flow', () => {

    it('should disable sign-in button when fullName is empty for new users', async () => {
      const { container } = renderWithAuthContext(SignInCore, {
        props: { initialEmail: 'newuser@example.com' },
        authConfig: { ...TEST_AUTH_CONFIGS.withAppCode, signInMode: 'login-or-register' },
        mockUserCheck: { exists: false, hasPasskey: false }
      });

      // Click the sign-in button to trigger user check
      const signInButton = container.querySelector('button[type="submit"]');
      expect(signInButton).toBeTruthy();
      await fireEvent.click(signInButton!);

      // Wait for fullName input to appear after user check
      await waitFor(() => {
        const fullNameInput = container.querySelector('#fullName');
        expect(fullNameInput).toBeTruthy();
      });

      // Check that submit button is disabled when fullName is empty
      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton).toBeTruthy();
      expect(submitButton?.disabled).toBe(true);
    });

    it('should disable sign-in button when fullName has less than 3 characters', async () => {
      const { container } = renderWithAuthContext(SignInCore, {
        props: { initialEmail: 'newuser@example.com' },
        authConfig: { ...TEST_AUTH_CONFIGS.withAppCode, signInMode: 'login-or-register' },
        mockUserCheck: { exists: false, hasPasskey: false }
      });

      // Click the sign-in button to trigger user check
      const signInButton = container.querySelector('button[type="submit"]');
      expect(signInButton).toBeTruthy();
      await fireEvent.click(signInButton!);

      // Wait for fullName input to appear after user check
      await waitFor(() => {
        const fullNameInput = container.querySelector('#fullName');
        expect(fullNameInput).toBeTruthy();
      });

      // Enter a short name (less than 3 characters)
      const fullNameInput = container.querySelector('#fullName') as HTMLInputElement;
      await fireEvent.input(fullNameInput, { target: { value: 'AB' } });

      // Check that submit button is still disabled
      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton?.disabled).toBe(true);
    });

    it('should enable sign-in button when fullName has 3 or more characters', async () => {
      const { container } = renderWithAuthContext(SignInCore, {
        props: { initialEmail: 'newuser@example.com' },
        authConfig: { ...TEST_AUTH_CONFIGS.withAppCode, signInMode: 'login-or-register' },
        mockUserCheck: { exists: false, hasPasskey: false }
      });

      // Wait for automatic user check to complete and fullName input to appear
      await waitFor(() => {
        const fullNameInput = container.querySelector('#fullName');
        expect(fullNameInput).toBeTruthy();
      });

      // Enter a valid name (3+ characters)
      const fullNameInput = container.querySelector('#fullName') as HTMLInputElement;
      await fireEvent.input(fullNameInput, { target: { value: 'John Doe' } });

      // Check that submit button is now enabled
      await waitFor(() => {
        const submitButton = container.querySelector('button[type="submit"]');
        expect(submitButton?.disabled).toBe(false);
      });
    });

    it('should call createAccount with correct parameters when form is submitted', async () => {
      const { container, authStore } = renderWithAuthContext(SignInCore, {
        props: { initialEmail: 'newuser@example.com' },
        authConfig: { ...TEST_AUTH_CONFIGS.withAppCode, signInMode: 'login-or-register' },
        mockUserCheck: { exists: false, hasPasskey: false }
      });

      // Mock the createAccount method
      authStore.createAccount = vi.fn().mockResolvedValue({
        user: { id: '123', email: 'newuser@example.com' },
        step: 'email-code'
      });

      // Wait for automatic user check to complete and fullName input to appear
      await waitFor(() => {
        const fullNameInput = container.querySelector('#fullName');
        expect(fullNameInput).toBeTruthy();
      });

      // Enter a valid full name
      const fullNameInput = container.querySelector('#fullName') as HTMLInputElement;
      await fireEvent.input(fullNameInput, { target: { value: 'John Doe' } });

      // Submit the form
      const form = container.querySelector('form');
      await fireEvent.submit(form!);

      // Verify createAccount was called with correct parameters
      await waitFor(() => {
        expect(authStore.createAccount).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          firstName: 'John',
          lastName: 'Doe',
          acceptedTerms: false,
          acceptedPrivacy: false
        });
      });
    });

    it('should show registration form only in login-or-register mode', async () => {
      const { container } = renderWithAuthContext(SignInCore, {
        props: { initialEmail: 'newuser@example.com' },
        authConfig: { ...TEST_AUTH_CONFIGS.withAppCode, signInMode: 'login-or-register' },
        mockUserCheck: { exists: false, hasPasskey: false }
      });

      // Click the sign-in button to trigger user check
      const signInButton = container.querySelector('button[type="submit"]');
      expect(signInButton).toBeTruthy();
      await fireEvent.click(signInButton!);

      // Wait for fullName input to appear after user check
      await waitFor(() => {
        const fullNameInput = container.querySelector('#fullName');
        expect(fullNameInput).toBeTruthy();
      });

      // Check that terms notice is shown
      const termsMessage = container.querySelector('.terms-notice');
      expect(termsMessage).toBeTruthy();
    });
  });

  describe('Login-only mode', () => {
    it('should not show fullName input in login-only mode', async () => {
      const { container } = renderWithAuthContext(SignInCore, {
        props: { initialEmail: 'newuser@example.com' },
        authConfig: { ...TEST_AUTH_CONFIGS.loginOnly },
        mockUserCheck: { exists: false, hasPasskey: false }
      });

      // Click the sign-in button to trigger user check
      const signInButton = container.querySelector('button[type="submit"]');
      expect(signInButton).toBeTruthy();
      await fireEvent.click(signInButton!);

      // Wait for the component to update after state transition
      await waitFor(() => {
        // Check that fullName input is NOT shown
        const fullNameInput = container.querySelector('#fullName');
        expect(fullNameInput).toBeFalsy();

        // Check that login-only message is shown
        const authMessage = container.querySelector('.auth-message');
        expect(authMessage).toBeTruthy();
        expect(authMessage?.textContent).toContain('Only registered users can sign in');
      });
    });

    it('should keep submit button disabled for non-existing users in login-only mode', async () => {
      const { container, authStore } = renderWithAuthContext(SignInCore, {
        props: { initialEmail: 'newuser@example.com' },
        authConfig: { ...TEST_AUTH_CONFIGS.loginOnly },
        mockUserCheck: { exists: false, hasPasskey: false }
      });

      // Mock createAccount to verify it's not called
      authStore.createAccount = vi.fn();

      // Click the sign-in button to trigger user check
      const signInButton = container.querySelector('button[type="submit"]');
      expect(signInButton).toBeTruthy();
      await fireEvent.click(signInButton!);

      // Verify createAccount was NOT called
      expect(authStore.createAccount).not.toHaveBeenCalled();
    });
  });

  describe('Existing user flow', () => {
    it('should not show fullName input for existing users', async () => {
      const { container } = renderWithAuthContext(SignInCore, {
        props: { initialEmail: 'existing@example.com' },
        authConfig: { ...TEST_AUTH_CONFIGS.withAppCode, signInMode: 'login-or-register' },
        mockUserCheck: { exists: true, hasPasskey: false }
      });

      // Click the sign-in button to trigger user check
      const signInButton = container.querySelector('button[type="submit"]');
      expect(signInButton).toBeTruthy();
      await fireEvent.click(signInButton!);

      // Wait for the component to transition to pin entry state for existing users
      await waitFor(() => {
        // For existing users, should transition to pin entry (email code input)
        const pinInput = container.querySelector('#code-input');
        expect(pinInput).toBeTruthy();

        // FullName input should NOT be shown anywhere
        const fullNameInput = container.querySelector('#fullName');
        expect(fullNameInput).toBeFalsy();

        // Should show "Check your email" message
        const emailMessage = container.querySelector('.auth-message');
        expect(emailMessage).toBeTruthy();
        expect(emailMessage?.textContent).toContain('Check your email');
      });
    });
  });
});
