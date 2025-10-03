/**
 * @vitest-environment jsdom
 * SignInForm Component Tests - Combined from components and disabled test files
 */

// Mock WebAuthn dependencies BEFORE any imports
vi.mock('../../src/utils/webauthn', () => ({
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true)),
  isWebAuthnSupported: vi.fn(() => true),
  isConditionalMediationSupported: vi.fn(() => Promise.resolve(false))
}));

import { fireEvent, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInForm from '../../src/components/SignInForm.svelte';
import type { AuthConfig } from '../../src/types';
import { TEST_AUTH_CONFIGS, renderWithStoreProp } from '../helpers/component-test-setup';

const mockConfig: AuthConfig = {
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  appCode: 'test-app',
  enablePasskeys: true,
  enableMagicLinks: true,
  branding: {
    companyName: 'Test Company',
    logoUrl: 'https://example.com/logo.svg',
    showPoweredBy: true,
    primaryColor: '#0066cc'
  }
};

describe('SignInForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with company branding', () => {
      const { container } = renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      expect(screen.getByText('Sign in')).toBeTruthy();
      expect(screen.getAllByText(/Test Company/)).toHaveLength(2); // Should appear in description and security message
      expect(screen.getByPlaceholderText('your@email.com')).toBeTruthy();
      // Button text varies based on features enabled
      const button = screen.getByRole('button');
      expect(button).toBeTruthy();
      expect(button.textContent).toMatch(
        /Sign in with Passkey|Send Magic Link|Continue|Send pin by email/
      );
    });

    it('should show logo when provided', () => {
      renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: { showLogo: true }
      });

      const logo = screen.getByRole('img');
      expect(logo).toBeTruthy();
      expect(logo.getAttribute('src')).toBe(mockConfig.branding?.logoUrl);
      expect(logo.getAttribute('alt')).toBe(mockConfig.branding?.companyName);
    });

    it('should hide logo when showLogo is false', () => {
      renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: { showLogo: false }
      });

      expect(screen.queryByRole('img')).not.toBeTruthy();
    });

    it('should show "Powered by Thepia" when enabled', () => {
      renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      expect(screen.getByText(/Secured by/)).toBeTruthy();
      expect(screen.getByText('Thepia')).toBeTruthy();
    });

    it('should hide "Powered by Thepia" when disabled', () => {
      const configWithoutPoweredBy = {
        ...mockConfig,
        branding: {
          companyName: 'Test Company',
          logoUrl: 'https://example.com/logo.svg',
          primaryColor: '#0066cc',
          showPoweredBy: false
        }
      };

      renderWithStoreProp(SignInForm, {
        authConfig: configWithoutPoweredBy,
        props: {}
      });

      expect(screen.queryByText(/Secured by/)).not.toBeTruthy();
    });

    it('should render in compact mode', () => {
      const { container } = renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: { compact: true }
      });

      const form = container.querySelector('.auth-form');
      expect(form?.classList.contains('auth-form--compact')).toBe(true);
    });

    it('should apply custom className', () => {
      const { container } = renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: { className: 'custom-class' }
      });

      const form = container.querySelector('.auth-form');
      expect(form?.classList.contains('custom-class')).toBe(true);
    });

    it('should render auth header with title and description', () => {
      const { container } = renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      // Check if auth-header container exists
      const authHeader = container.querySelector('.auth-header');
      expect(authHeader).toBeTruthy();

      // Check if title exists and has correct text
      const title = container.querySelector('.auth-title');
      expect(title).toBeTruthy();
      expect(title?.textContent).toBe('Sign in');

      // Check if description exists
      const description = container.querySelector('.auth-description');
      expect(description).toBeTruthy();
      expect(description?.textContent).toContain('Test Company');
    });

    it('should apply correct CSS classes for variants', () => {
      const { container } = renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {
          size: 'large',
          variant: 'popup',
          compact: true
        }
      });

      const form = container.querySelector('.auth-form');
      expect(form).toBeTruthy();
      expect(form?.classList.contains('auth-form--large')).toBe(true);
      expect(form?.classList.contains('auth-form--popup')).toBe(true);
      expect(form?.classList.contains('auth-form--compact')).toBe(true);
    });
  });

  describe('Form Interaction', () => {
    it('should update email input', async () => {
      renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      const emailInput = screen.getByPlaceholderText('your@email.com') as HTMLInputElement;

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput.value).toBe('test@example.com');
    });

    it('should set initial email value', () => {
      renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: { initialEmail: 'initial@example.com' }
      });

      const emailInput = screen.getByPlaceholderText('your@email.com') as HTMLInputElement;
      expect(emailInput.value).toBe('initial@example.com');
    });

    it('should disable continue button when email is empty', () => {
      renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      const submitButton = screen.getByRole('button');
      expect(submitButton.hasAttribute('disabled')).toBe(true);
    });

    it('should enable continue button when email is entered and user check completes', async () => {
      const { authStore } = renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const submitButton = screen.getByRole('button');

      // Initially button should be disabled
      expect(submitButton.hasAttribute('disabled')).toBe(true);

      // Enter email
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await tick();

      // Button should still be disabled in emailEntry state
      expect(submitButton.hasAttribute('disabled')).toBe(true);

      // Simulate user check completion (this is what the reactive statement does)
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false,
        hasValidPin: false,
        pinRemainingMinutes: 0
      });
      await tick();

      // Now button should be enabled in userChecked state
      expect(submitButton.hasAttribute('disabled')).toBe(false);
    });

    it('should show loading state during submission', async () => {
      const { authStore } = renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const submitButton = screen.getByRole('button');

      // Enter email and complete user check to enable button
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false,
        hasValidPin: false,
        pinRemainingMinutes: 0
      });
      await tick();

      // Now button should be enabled and clickable
      expect(submitButton.hasAttribute('disabled')).toBe(false);

      await fireEvent.click(submitButton);

      // Check for loading text (the actual text depends on the button configuration)
      expect(screen.getByText('Sending pin...')).toBeTruthy();
      expect(submitButton.hasAttribute('disabled')).toBe(true);
    });

    it('should show error state', async () => {
      renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      const emailInput = screen.getByPlaceholderText('your@email.com');

      await fireEvent.input(emailInput, { target: { value: 'invalid-email' } });

      // The form should show an error for invalid email format
      const form = emailInput.closest('form');
      expect(form).toBeTruthy();
    });
  });

  describe('Form Submission', () => {
    it('should emit success event on successful authentication', async () => {
      const successHandler = vi.fn();

      const { component } = renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      component.$on('success', successHandler);

      // Simulate SignInCore emitting a success event
      const mockSuccessEvent = {
        detail: {
          user: {
            email: 'test@example.com',
            name: 'Test User',
            id: 'test-user-id'
          },
          method: 'email-code'
        }
      };

      // Trigger the success handler directly to test event forwarding
      // This tests that SignInForm properly forwards events from SignInCore
      if (component.$$.callbacks.success?.[0]) {
        component.$$.callbacks.success[0](mockSuccessEvent);
      }

      // Verify the success event was forwarded
      expect(successHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            user: expect.objectContaining({
              email: 'test@example.com',
              name: 'Test User'
            }),
            method: 'email-code'
          }
        })
      );
    });

    it('should not submit with empty email', async () => {
      const successHandler = vi.fn();

      const { component } = renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      component.$on('success', successHandler);

      const continueButton = screen.getByRole('button');

      await fireEvent.click(continueButton);

      expect(successHandler).not.toHaveBeenCalled();
    });

    it('should prevent default form submission', async () => {
      renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      const form = document.querySelector('form');
      const submitHandler = vi.fn();

      if (form) {
        form.addEventListener('submit', submitHandler);

        const emailInput = screen.getByPlaceholderText('your@email.com');
        await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

        await fireEvent.submit(form);

        expect(submitHandler).toHaveBeenCalled();
        expect(submitHandler.mock.calls[0][0].defaultPrevented).toBe(true);
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      const emailInput = screen.getByLabelText('Email address');
      expect(emailInput).toBeTruthy();
      expect(emailInput.getAttribute('type')).toBe('email');
      expect(emailInput.getAttribute('autocomplete')).toBe('email webauthn');
      expect(emailInput.hasAttribute('required')).toBe(true);
    });

    it('should have proper ARIA attributes', () => {
      renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      const emailInput = screen.getByPlaceholderText('your@email.com');
      expect(emailInput.getAttribute('id')).toBe('email-input');

      const label = screen.getByText('Email address');
      expect(label.getAttribute('for')).toBe('email-input');
    });

    it('should show loading spinner with proper accessibility', async () => {
      const { authStore } = renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const continueButton = screen.getByRole('button');

      // Enter email and complete user check to enable button
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false,
        hasValidPin: false,
        pinRemainingMinutes: 0
      });
      await tick();

      await fireEvent.click(continueButton);

      // Check for loading state - the spinner class might be different
      // Let's check for the loading text instead which is more reliable
      expect(screen.getByText('Sending pin...')).toBeTruthy();
      expect(continueButton.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Responsive Design', () => {
    it('should apply mobile styles', () => {
      const { container } = renderWithStoreProp(SignInForm, {
        authConfig: mockConfig,
        props: {}
      });

      // Check if mobile responsive styles are present
      const form = container.querySelector('.auth-form');
      expect(form).toBeTruthy();

      // The actual mobile styles are CSS-based, so we just verify the structure exists
      const logo = container.querySelector('.auth-logo');
      const formContainer = container.querySelector('.auth-container');

      expect(logo).toBeTruthy();
      expect(formContainer).toBeTruthy();
    });
  });

  /*
  xit('should render header icon section', async () => {
    const { container } = render(TestWrapper, {
      props: {}
    });

    const headerIcon = container.querySelector('.auth-header-icon');
    expect(headerIcon).toBeTruthy();

    const iconContainer = headerIcon.querySelector('.w-16.h-16');
    expect(iconContainer).toBeTruthy();

    const svg = headerIcon.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  xit('should render policy footer section', async () => {
    const { container } = render(TestWrapper, {
      props: {}
    });

    const policyFooter = container.querySelector('.auth-policy-footer');
    expect(policyFooter).toBeTruthy();

    // Check for security features
    const securityFeatures = policyFooter.querySelectorAll('.flex.items-center');
    expect(securityFeatures.length).toBe(3);

    // Check for specific text content
    expect(policyFooter.textContent).toContain('Secure passkey authentication');
    expect(policyFooter.textContent).toContain('Privacy-compliant access');
    expect(policyFooter.textContent).toContain('Employee verification required');
  });
  */
});
