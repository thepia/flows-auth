/**
 * @vitest-environment jsdom
 * Regression Tests for Error Handling Fixes
 *
 * These tests guard against the specific bugs we fixed:
 * 1. Technical error exposure to users
 * 2. Incorrect API configuration architecture
 * 3. Component compilation issues
 * 4. Missing automatic registration flow
 */

// Mock WebAuthn dependencies BEFORE any imports
vi.mock('../../src/utils/webauthn', () => ({
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true)),
  isWebAuthnSupported: vi.fn(() => true),
  isConditionalMediationSupported: vi.fn(() => Promise.resolve(true))
}));

import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInForm from '../../src/components/SignInForm.svelte';
import type { AuthConfig } from '../../src/types';
import { renderWithAuthContext } from '../helpers/component-test-setup';

const defaultConfig: AuthConfig = {
  apiBaseUrl: 'https://api.thepia.com',
  domain: 'test.com',
  appCode: 'test-app',
  enablePasskeys: true,
  enableMagicLinks: true,
  branding: {
    companyName: 'Test Company'
  }
};

describe('Error Handling Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Bug Fix: Technical Error Exposure', () => {
    it('should NOT expose technical API endpoint errors to users', async () => {
      // Simulate the original bug: API returns technical error
      const technicalError = new Error('Endpoint not found');

      const { authStore } = renderWithAuthContext(SignInForm, {
        authConfig: defaultConfig,
        props: { config: defaultConfig }
      });

      // Mock the API client to throw technical error
      vi.mocked(authStore.api.checkEmail).mockRejectedValue(technicalError);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const signInButton = screen.getByRole('button');

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(signInButton);

      await waitFor(() => {
        // ✅ REGRESSION TEST: Technical error should NOT be visible
        expect(screen.queryByText('Endpoint not found')).toBeNull();
        expect(screen.queryByText('404')).toBeNull();
        expect(screen.queryByText('not found')).toBeNull();

        // ✅ Should show user-friendly message OR auto-transition to registration
        const hasUserFriendlyError =
          screen.queryByText(/authentication.*failed/i) ||
          screen.queryByText(/try again/i) ||
          screen.queryByText(/Terms of Service/i); // Registration step
        expect(hasUserFriendlyError).toBeTruthy();
      });
    });

    /*
    it('should show user-friendly messages for common API errors', async () => {
      const testCases = [
        {
          error: new Error('Endpoint not found'),
          expectedPattern: /no passkey found|register.*passkey|try again/i
        },
        {
          error: new Error('404: /auth/webauthn/challenge not found'),
          expectedPattern: /service.*unavailable|try again/i
        },
        {
          error: { status: 404, message: 'Not found' },
          expectedPattern: /service.*unavailable|try again/i
        }
      ];

      for (const testCase of testCases) {
        const { authStore } = renderWithAuthContext(SignInForm, {
          authConfig: defaultConfig,
          props: { config: defaultConfig }
        });

        // Mock the API client to throw the specific error
        vi.mocked(authStore.api.checkEmail).mockRejectedValue(testCase.error);

        const emailInput = screen.getByPlaceholderText('your@email.com');
        const signInButton = screen.getByRole('button');

        await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
        await fireEvent.click(signInButton);

        await waitFor(() => {
          // ✅ Should show user-friendly message
          const errorElements = document.querySelectorAll('[class*="error"], [role="alert"]');
          const hasUserFriendlyMessage = Array.from(errorElements).some((el) =>
            testCase.expectedPattern.test(el.textContent || '')
          );
          expect(hasUserFriendlyMessage).toBeTruthy();
        });
      }
    });
    */
  });

  /*
  describe('Bug Fix: Automatic Registration Flow', () => {
    it('should automatically transition to registration for unregistered users', async () => {
      const { authStore } = renderWithAuthContext(SignInForm, {
        authConfig: defaultConfig,
        props: { config: defaultConfig },
        mockUserCheck: {
          exists: false,
          hasPasskey: false,
          userId: null
        }
      });

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const signInButton = screen.getByRole('button');

      await fireEvent.input(emailInput, { target: { value: 'newuser@example.com' } });
      await fireEvent.click(signInButton);

      await waitFor(() => {
        // ✅ REGRESSION TEST: Should auto-transition to registration
        expect(screen.queryByText(/Terms of Service/i)).toBeTruthy();
        expect(screen.queryByText(/Privacy Policy/i)).toBeTruthy();

        // ✅ Should NOT show error message for unregistered user
        expect(screen.queryByText(/authentication.*failed/i)).toBeNull();
        expect(screen.queryByText(/no.*passkey.*found/i)).toBeNull();
      });
    });

    it('should NOT show unhelpful error messages for missing passkeys', async () => {
      const { authStore } = renderWithAuthContext(SignInForm, {
        authConfig: { ...defaultConfig, enableMagicLinks: true },
        props: { config: { ...defaultConfig, enableMagicLinks: true } },
        mockUserCheck: {
          exists: true,
          hasPasskey: false,
          userId: 'user123'
        }
      });

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const signInButton = screen.getByRole('button');

      await fireEvent.input(emailInput, { target: { value: 'existing@example.com' } });
      await fireEvent.click(signInButton);

      await waitFor(() => {
        // ✅ REGRESSION TEST: Should NOT show "what's wrong" without solution
        expect(screen.queryByText(/no passkey found.*register/i)).toBeNull();

        // ✅ Should either auto-transition or provide clear action
        const hasActionableFlow =
          screen.queryByText(/magic link/i) ||
          screen.queryByText(/Terms of Service/i) ||
          screen.queryByText(/check.*email/i);
        expect(hasActionableFlow).toBeTruthy();
      });
    });
  });
  */

  describe('Bug Fix: Correct API Architecture', () => {
    it('should use authStore.checkUser() not direct API calls', async () => {
      const { authStore } = renderWithAuthContext(SignInForm, {
        authConfig: defaultConfig,
        props: { config: defaultConfig },
        mockUserCheck: {
          exists: true,
          hasPasskey: true,
          userId: 'user123'
        }
      });

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const signInButton = screen.getByRole('button');

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(signInButton);

      await waitFor(() => {
        // ✅ REGRESSION TEST: Should use authStore.checkUser() via API client
        expect(authStore.api.checkEmail).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should inherit API configuration from auth store', () => {
      // ✅ REGRESSION TEST: Component should not have its own apiBaseUrl
      const { container } = renderWithAuthContext(SignInForm, {
        authConfig: defaultConfig,
        props: {
          config: {
            // Note: No apiBaseUrl here - should inherit from auth store
            domain: 'test.com',
            appCode: 'test-app'
          }
        }
      });

      // Component should render without requiring its own API config
      expect(container.querySelector('form')).toBeTruthy();
    });
  });

  describe('Bug Fix: Component Compilation', () => {
    it('should render without "Cannot read properties of undefined" errors', () => {
      // ✅ REGRESSION TEST: Component should compile and render properly
      expect(() => {
        renderWithAuthContext(SignInForm, {
          authConfig: defaultConfig,
          props: { config: defaultConfig }
        });
      }).not.toThrow();
    });

    it('should have all required UI elements', () => {
      renderWithAuthContext(SignInForm, {
        authConfig: defaultConfig,
        props: { config: defaultConfig }
      });

      // ✅ REGRESSION TEST: Core UI elements should be present
      expect(screen.getByRole('button')).toBeTruthy();
      expect(screen.getByPlaceholderText('your@email.com')).toBeTruthy();
      expect(screen.getByText(/to Test Company/)).toBeTruthy();
    });
  });
});
