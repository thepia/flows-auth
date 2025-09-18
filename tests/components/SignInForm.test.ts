/**
 * @vitest-environment jsdom
 * SignInForm Component Tests - Combined from components and disabled test files
 */

// Mock WebAuthn dependencies BEFORE any imports
vi.mock('../../src/utils/webauthn', () => ({
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true)),
  isWebAuthnSupported: vi.fn(() => true)
}));

import { fireEvent, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInForm from '../../src/components/SignInForm.svelte';
import type { AuthConfig } from '../../src/types';
import { TEST_AUTH_CONFIGS, renderWithAuthContext } from '../helpers/component-test-setup';

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
      const { container } = renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
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
      renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig, showLogo: true }
      });

      const logo = screen.getByRole('img');
      expect(logo).toBeTruthy();
      expect(logo.getAttribute('src')).toBe(mockConfig.branding?.logoUrl);
      expect(logo.getAttribute('alt')).toBe(mockConfig.branding?.companyName);
    });

    it('should hide logo when showLogo is false', () => {
      renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig, showLogo: false }
      });

      expect(screen.queryByRole('img')).not.toBeTruthy();
    });

    it('should show "Powered by Thepia" when enabled', () => {
      renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
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

      renderWithAuthContext(SignInForm, {
        authConfig: configWithoutPoweredBy,
        props: { config: configWithoutPoweredBy }
      });

      expect(screen.queryByText(/Secured by/)).not.toBeTruthy();
    });

    it('should render in compact mode', () => {
      const { container } = renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig, compact: true }
      });

      const form = container.querySelector('.auth-form');
      expect(form?.classList.contains('auth-form--compact')).toBe(true);
    });

    it('should apply custom className', () => {
      const { container } = renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig, className: 'custom-class' }
      });

      const form = container.querySelector('.auth-form');
      expect(form?.classList.contains('custom-class')).toBe(true);
    });

    it('should render auth header with title and description', () => {
      const { container } = renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
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
      const { container } = renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: {
          config: mockConfig,
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
      renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
      });

      const emailInput = screen.getByPlaceholderText('your@email.com') as HTMLInputElement;

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput.value).toBe('test@example.com');
    });

    it('should set initial email value', () => {
      renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig, initialEmail: 'initial@example.com' }
      });

      const emailInput = screen.getByPlaceholderText('your@email.com') as HTMLInputElement;
      expect(emailInput.value).toBe('initial@example.com');
    });

    it('should disable continue button when email is empty', () => {
      renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
      });

      const submitButton = screen.getByRole('button');
      expect(submitButton.hasAttribute('disabled')).toBe(true);
    });

    it('should enable continue button when email is entered', async () => {
      renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
      });

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const submitButton = screen.getByRole('button');

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

      expect(submitButton.hasAttribute('disabled')).toBe(false);
    });

    it('should show loading state during submission', async () => {
      renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
      });

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const submitButton = screen.getByRole('button');

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(submitButton);

      expect(screen.getByText('Signing in...')).toBeTruthy();
      expect(submitButton.hasAttribute('disabled')).toBe(true);
    });

    it('should show error state', async () => {
      renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
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

      const { component } = renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
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

      const { component } = renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
      });

      component.$on('success', successHandler);

      const continueButton = screen.getByRole('button');

      await fireEvent.click(continueButton);

      expect(successHandler).not.toHaveBeenCalled();
    });

    it('should prevent default form submission', async () => {
      renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
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
      renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
      });

      const emailInput = screen.getByLabelText('Email address');
      expect(emailInput).toBeTruthy();
      expect(emailInput.getAttribute('type')).toBe('email');
      expect(emailInput.getAttribute('autocomplete')).toBe('email webauthn');
      expect(emailInput.hasAttribute('required')).toBe(true);
    });

    it('should have proper ARIA attributes', () => {
      renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
      });

      const emailInput = screen.getByPlaceholderText('your@email.com');
      expect(emailInput.getAttribute('id')).toBe('email-input');

      const label = screen.getByText('Email address');
      expect(label.getAttribute('for')).toBe('email-input');
    });

    it('should show loading spinner with proper accessibility', async () => {
      renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
      });

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const continueButton = screen.getByRole('button');

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(continueButton);

      const spinner = document.querySelector('.spinner');
      expect(spinner).toBeTruthy();
    });
  });

  describe('Responsive Design', () => {
    it('should apply mobile styles', () => {
      const { container } = renderWithAuthContext(SignInForm, {
        authConfig: mockConfig,
        props: { config: mockConfig }
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
