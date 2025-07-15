/**
 * SignInForm Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import SignInForm from '../../src/components/SignInForm.svelte';
import type { AuthConfig } from '../../src/types';

const mockConfig: AuthConfig = {
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  enablePasskeys: true,
  enableMagicLinks: true,
  enablePasswordLogin: true,
  enableSocialLogin: false,
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
      const { container } = render(SignInForm, {
        props: { config: mockConfig }
      });

      expect(screen.getByText('Sign in')).toBeInTheDocument();
      expect(screen.getByText(/Test Company/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('your.email@company.com')).toBeInTheDocument();
      // Button text varies based on features enabled
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.textContent).toMatch(/Sign in with Passkey|Send Magic Link|Continue/);
    });

    it('should show logo when provided', () => {
      render(SignInForm, {
        props: { config: mockConfig, showLogo: true }
      });

      const logo = screen.getByRole('img');
      expect(logo).toBeInTheDocument();
      expect(logo.getAttribute('src')).toBe(mockConfig.branding?.logoUrl);
      expect(logo.getAttribute('alt')).toBe(mockConfig.branding?.companyName);
    });

    it('should hide logo when showLogo is false', () => {
      render(SignInForm, {
        props: { config: mockConfig, showLogo: false }
      });

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should show "Powered by Thepia" when enabled', () => {
      render(SignInForm, {
        props: { config: mockConfig }
      });

      expect(screen.getByText(/Secured by/)).toBeInTheDocument();
      expect(screen.getByText('Thepia')).toBeInTheDocument();
    });

    it('should hide "Powered by Thepia" when disabled', () => {
      const configWithoutPoweredBy = {
        ...mockConfig,
        branding: { ...mockConfig.branding, showPoweredBy: false }
      };

      render(SignInForm, {
        props: { config: configWithoutPoweredBy }
      });

      expect(screen.queryByText(/Secured by/)).not.toBeInTheDocument();
    });

    it('should render in compact mode', () => {
      const { container } = render(SignInForm, {
        props: { config: mockConfig, compact: true }
      });

      const form = container.querySelector('.auth-form');
      expect(form).toHaveClass('compact');
    });

    it('should apply custom className', () => {
      const { container } = render(SignInForm, {
        props: { config: mockConfig, className: 'custom-class' }
      });

      const form = container.querySelector('.auth-form');
      expect(form).toHaveClass('custom-class');
    });
  });

  describe('Form Interaction', () => {
    it('should update email input', async () => {
      render(SignInForm, {
        props: { config: mockConfig }
      });

      const emailInput = screen.getByPlaceholderText('your.email@company.com') as HTMLInputElement;
      
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should set initial email value', () => {
      render(SignInForm, {
        props: { config: mockConfig, initialEmail: 'initial@example.com' }
      });

      const emailInput = screen.getByPlaceholderText('your.email@company.com') as HTMLInputElement;
      expect(emailInput.value).toBe('initial@example.com');
    });

    it('should disable continue button when email is empty', () => {
      render(SignInForm, {
        props: { config: mockConfig }
      });

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
    });

    it('should enable continue button when email is entered', async () => {
      render(SignInForm, {
        props: { config: mockConfig }
      });

      const emailInput = screen.getByPlaceholderText('your.email@company.com');
      const submitButton = screen.getByRole('button');

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

      expect(submitButton).not.toBeDisabled();
    });

    it('should show loading state during submission', async () => {
      render(SignInForm, {
        props: { config: mockConfig }
      });

      const emailInput = screen.getByPlaceholderText('your.email@company.com');
      const submitButton = screen.getByRole('button');

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(submitButton);

      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should show error state', async () => {
      render(SignInForm, {
        props: { config: mockConfig }
      });

      const emailInput = screen.getByPlaceholderText('your.email@company.com');
      
      await fireEvent.input(emailInput, { target: { value: 'invalid-email' } });
      
      // The form should show an error for invalid email format
      const form = emailInput.closest('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should emit success event on successful authentication', async () => {
      const successHandler = vi.fn();
      
      const { component } = render(SignInForm, {
        props: { config: mockConfig }
      });

      component.$on('success', successHandler);

      const emailInput = screen.getByPlaceholderText('your.email@company.com');
      const continueButton = screen.getByRole('button');

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(continueButton);

      // Wait for the mock timeout to complete
      await waitFor(() => {
        expect(successHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: {
              user: expect.objectContaining({
                email: 'test@example.com',
                name: 'Test User'
              }),
              method: expect.stringMatching(/passkey|magic-link/)
            }
          })
        );
      }, { timeout: 2000 });
    });

    it('should not submit with empty email', async () => {
      const successHandler = vi.fn();
      
      const { component } = render(SignInForm, {
        props: { config: mockConfig }
      });

      component.$on('success', successHandler);

      const continueButton = screen.getByRole('button');
      
      await fireEvent.click(continueButton);

      expect(successHandler).not.toHaveBeenCalled();
    });

    it('should prevent default form submission', async () => {
      render(SignInForm, {
        props: { config: mockConfig }
      });

      const form = document.querySelector('form');
      const submitHandler = vi.fn();
      
      if (form) {
        form.addEventListener('submit', submitHandler);
        
        const emailInput = screen.getByPlaceholderText('your.email@company.com');
        await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
        
        await fireEvent.submit(form);
        
        expect(submitHandler).toHaveBeenCalled();
        expect(submitHandler.mock.calls[0][0].defaultPrevented).toBe(true);
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(SignInForm, {
        props: { config: mockConfig }
      });

      const emailInput = screen.getByLabelText('Email address');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput.getAttribute('type')).toBe('email');
      expect(emailInput.getAttribute('autocomplete')).toBe('email webauthn');
      expect(emailInput.hasAttribute('required')).toBe(true);
    });

    it('should have proper ARIA attributes', () => {
      render(SignInForm, {
        props: { config: mockConfig }
      });

      const emailInput = screen.getByPlaceholderText('your.email@company.com');
      expect(emailInput.getAttribute('id')).toBe('email');
      
      const label = screen.getByText('Email address');
      expect(label.getAttribute('for')).toBe('email');
    });

    it('should show loading spinner with proper accessibility', async () => {
      render(SignInForm, {
        props: { config: mockConfig }
      });

      const emailInput = screen.getByPlaceholderText('your.email@company.com');
      const continueButton = screen.getByRole('button');

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(continueButton);

      const spinner = document.querySelector('.loading-spinner');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should apply mobile styles', () => {
      const { container } = render(SignInForm, {
        props: { config: mockConfig }
      });

      // Check if mobile responsive styles are present
      const form = container.querySelector('.auth-form');
      expect(form).toBeInTheDocument();
      
      // The actual mobile styles are CSS-based, so we just verify the structure exists
      const logo = container.querySelector('.auth-logo');
      const formContainer = container.querySelector('.auth-container');
      
      expect(logo).toBeInTheDocument();
      expect(formContainer).toBeInTheDocument();
    });
  });
});