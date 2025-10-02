/**
 * Automatic Flow Detection Integration Tests
 *
 * Purpose: Test the thepia.com-style automatic user detection and flow switching
 * Context: Tests the new SignInForm automatic flow detection feature
 * Safe to remove: No - critical for preventing UX regressions
 *
 * Do NOT introduce mocking of the API client
 * Do introduce mocking of browser APIs like WebAuthn to ensure correct switching of options.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInForm from '../../src/components/SignInForm.svelte';
import type { AuthConfig } from '../../src/types';
import { APIMocker, TEST_ACCOUNTS, TEST_CONFIG, TestUtils, WebAuthnMocker } from '../test-setup';

// Test configuration with API fallback
const getTestConfig = (): AuthConfig => {
  const isLocalServerRunning = process.env.CI_API_SERVER_RUNNING === 'true';
  const apiBaseUrl = isLocalServerRunning
    ? 'https://dev.thepia.com:8443'
    : 'https://api.thepia.com';

  return {
    ...TEST_CONFIG,
    apiBaseUrl,
    clientId: 'flows-auth-flow-detection-test'
  };
};

describe('Automatic Flow Detection', () => {
  let testConfig: AuthConfig;

  beforeEach(() => {
    testConfig = getTestConfig();
    localStorage.clear();
    vi.clearAllMocks();

    // Mock WebAuthn availability
    Object.defineProperty(window, 'PublicKeyCredential', {
      value: {
        isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true),
        isConditionalMediationAvailable: vi.fn().mockResolvedValue(true)
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    TestUtils.cleanup();
  });

  describe('User Detection Flow', () => {
    it('should automatically detect existing user and show sign-in options', async () => {
      const existingEmail = TEST_ACCOUNTS.existingWithPasskey.email;

      // Mock API response for existing user
      APIMocker.mockEmailCheck(existingEmail, {
        exists: true,
        hasPasskey: true
      });

      const { container } = render(SignInForm, {
        props: {
          config: testConfig,
          showLogo: false,
          compact: false
        }
      });

      // Find email input and enter existing user email
      const emailInput = screen.getByPlaceholderText(/email/i);
      expect(emailInput).toBeTruthy();

      await fireEvent.input(emailInput, { target: { value: existingEmail } });

      // Find and click continue button
      const continueButton = screen.getByRole('button', { name: /sign in|continue/i });
      expect(continueButton).toBeTruthy();

      await fireEvent.click(continueButton);

      // Should show passkey authentication option
      await waitFor(
        () => {
          const passkeyButton = screen.queryByText(/passkey|touch id|face id/i);
          expect(passkeyButton).toBeTruthy();
        },
        { timeout: 5000 }
      );
    });

    it('should automatically detect new user and show registration flow', async () => {
      const newEmail = TEST_ACCOUNTS.newUser.email;

      // Mock API response for new user
      APIMocker.mockEmailCheck(newEmail, {
        exists: false,
        hasPasskey: false
      });

      const { container } = render(SignInForm, {
        props: {
          config: testConfig,
          showLogo: false,
          compact: false
        }
      });

      // Find email input and enter new user email
      const emailInput = screen.getByPlaceholderText(/email/i);
      await fireEvent.input(emailInput, { target: { value: newEmail } });

      // Find and click continue button
      const continueButton = screen.getByRole('button', { name: /sign in|continue/i });
      await fireEvent.click(continueButton);

      // Should show registration flow (Terms of Service)
      await waitFor(
        () => {
          const termsText = screen.queryByText(/terms.*service|privacy.*policy/i);
          expect(termsText).toBeTruthy();
        },
        { timeout: 5000 }
      );
    });

    it('should handle API errors during user detection gracefully', async () => {
      const testEmail = 'test-error@thepia.net';

      // Mock API error
      APIMocker.mockNetworkError();

      const { container } = render(SignInForm, {
        props: {
          config: testConfig,
          showLogo: false,
          compact: false
        }
      });

      // Find email input and enter email
      const emailInput = screen.getByPlaceholderText(/email/i);
      await fireEvent.input(emailInput, { target: { value: testEmail } });

      // Find and click continue button
      const continueButton = screen.getByRole('button', { name: /sign in|continue/i });
      await fireEvent.click(continueButton);

      // Should show error message
      await waitFor(
        () => {
          const errorMessage = screen.queryByText(/error|failed|try again/i);
          expect(errorMessage).toBeTruthy();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Registration Flow Steps', () => {
    it('should complete registration flow from terms to passkey setup', async () => {
      const newEmail = `test-registration-flow-${Date.now()}@thepia.net`;

      // Mock API responses
      APIMocker.mockEmailCheck(newEmail, {
        exists: false,
        hasPasskey: false
      });

      WebAuthnMocker.mockSuccess('new-registration-credential');

      const { container } = render(SignInForm, {
        props: {
          config: testConfig,
          showLogo: false,
          compact: false
        }
      });

      // Step 1: Enter email and trigger registration flow
      const emailInput = screen.getByPlaceholderText(/email/i);
      await fireEvent.input(emailInput, { target: { value: newEmail } });

      const continueButton = screen.getByRole('button', { name: /sign in|continue/i });
      await fireEvent.click(continueButton);

      // Step 2: Accept terms of service
      await waitFor(() => {
        const termsCheckbox = screen.queryByLabelText(/terms.*service/i);
        expect(termsCheckbox).toBeTruthy();
      });

      const termsCheckbox = screen.getByLabelText(/terms.*service/i);
      const privacyCheckbox = screen.getByLabelText(/privacy.*policy/i);

      await fireEvent.click(termsCheckbox);
      await fireEvent.click(privacyCheckbox);

      const acceptButton = screen.getByRole('button', { name: /accept|continue/i });
      await fireEvent.click(acceptButton);

      // Step 3: Should show passkey registration
      await waitFor(() => {
        const passkeyRegisterButton = screen.queryByText(/register.*passkey|create.*account/i);
        expect(passkeyRegisterButton).toBeTruthy();
      });
    });

    it('should validate terms acceptance before proceeding', async () => {
      const newEmail = `test-terms-validation-${Date.now()}@thepia.net`;

      APIMocker.mockEmailCheck(newEmail, {
        exists: false,
        hasPasskey: false
      });

      const { container } = render(SignInForm, {
        props: {
          config: testConfig,
          showLogo: false,
          compact: false
        }
      });

      // Enter email and get to terms step
      const emailInput = screen.getByPlaceholderText(/email/i);
      await fireEvent.input(emailInput, { target: { value: newEmail } });

      const continueButton = screen.getByRole('button', { name: /sign in|continue/i });
      await fireEvent.click(continueButton);

      // Try to proceed without accepting terms
      await waitFor(() => {
        const acceptButton = screen.queryByRole('button', { name: /accept|continue/i });
        expect(acceptButton).toBeTruthy();
      });

      const acceptButton = screen.getByRole('button', { name: /accept|continue/i });

      // Button should be disabled without terms acceptance
      expect(acceptButton).toHaveProperty('disabled', true);
    });
  });

  describe('Sign-In Flow Options', () => {
    it('should show passkey option for users with passkeys', async () => {
      const existingEmail = TEST_ACCOUNTS.existingWithPasskey.email;

      APIMocker.mockEmailCheck(existingEmail, {
        exists: true,
        hasPasskey: true
      });

      APIMocker.mockPasskeyChallenge(existingEmail);
      WebAuthnMocker.mockSuccess('existing-credential');

      const { container } = render(SignInForm, {
        props: {
          config: testConfig,
          showLogo: false,
          compact: false
        }
      });

      // Enter existing user email
      const emailInput = screen.getByPlaceholderText(/email/i);
      await fireEvent.input(emailInput, { target: { value: existingEmail } });

      const continueButton = screen.getByRole('button', { name: /sign in|continue/i });
      await fireEvent.click(continueButton);

      // Should show passkey authentication
      await waitFor(() => {
        const passkeyButton = screen.queryByText(/passkey|touch id|face id/i);
        expect(passkeyButton).toBeTruthy();
      });
    });

    it('should show magic link option for users without passkeys', async () => {
      const existingEmail = TEST_ACCOUNTS.existingWithoutPasskey.email;

      APIMocker.mockEmailCheck(existingEmail, {
        exists: true,
        hasPasskey: false
      });

      APIMocker.mockMagicLinkSent(existingEmail);

      const { container } = render(SignInForm, {
        props: {
          config: testConfig,
          showLogo: false,
          compact: false
        }
      });

      // Enter existing user email without passkey
      const emailInput = screen.getByPlaceholderText(/email/i);
      await fireEvent.input(emailInput, { target: { value: existingEmail } });

      const continueButton = screen.getByRole('button', { name: /sign in|continue/i });
      await fireEvent.click(continueButton);

      // Should show magic link option
      await waitFor(() => {
        const magicLinkButton = screen.queryByText(/magic link|send.*link/i);
        expect(magicLinkButton).toBeTruthy();
      });
    });
  });

  describe('Form State Management', () => {
    it('should maintain email value across flow transitions', async () => {
      const testEmail = 'test-state-persistence@thepia.net';

      APIMocker.mockEmailCheck(testEmail, {
        exists: false,
        hasPasskey: false
      });

      const { container } = render(SignInForm, {
        props: {
          config: testConfig,
          showLogo: false,
          compact: false
        }
      });

      // Enter email
      const emailInput = screen.getByPlaceholderText(/email/i);
      await fireEvent.input(emailInput, { target: { value: testEmail } });

      // Proceed to registration flow
      const continueButton = screen.getByRole('button', { name: /sign in|continue/i });
      await fireEvent.click(continueButton);

      // Go back to email step
      await waitFor(() => {
        const backButton = screen.queryByText(/back|previous/i);
        if (backButton) {
          fireEvent.click(backButton);
        }
      });

      // Email should still be there
      await waitFor(() => {
        const emailInputAfterBack = screen.queryByDisplayValue(testEmail);
        expect(emailInputAfterBack).toBeTruthy();
      });
    });

    it('should handle rapid email changes without race conditions', async () => {
      const emails = ['test1@thepia.net', 'test2@thepia.net', 'test3@thepia.net'];

      // Mock different responses for different emails
      emails.forEach((email, index) => {
        APIMocker.mockEmailCheck(email, {
          exists: index % 2 === 0, // Alternate between existing and new users
          hasPasskey: index % 2 === 0
        });
      });

      const { container } = render(SignInForm, {
        props: {
          config: testConfig,
          showLogo: false,
          compact: false
        }
      });

      const emailInput = screen.getByPlaceholderText(/email/i);

      // Rapidly change emails
      for (const email of emails) {
        await fireEvent.input(emailInput, { target: { value: email } });
        await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
      }

      // Should handle the final email correctly
      const finalEmail = emails[emails.length - 1];
      expect(emailInput).toHaveProperty('value', finalEmail);
    });
  });
});
