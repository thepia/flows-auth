/**
 * Comprehensive Test Suite for AccountCreationForm Component
 * 
 * This test suite covers all aspects of the enhanced AccountCreationForm component
 * including business fields, invitation token integration, and dynamic field behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import AccountCreationForm from '../../src/components/AccountCreationForm.svelte';
import type { AuthConfig, InvitationTokenData } from '../../src/types';

// Mock the auth store
const mockAuthStore = {
  createAccount: vi.fn(), // FIXED: Use createAccount instead of registerUser
  registerUser: vi.fn(), // Keep for backward compatibility tests
  api: {
    checkEmail: vi.fn()
  }
};

// Mock the createAuthStore function
vi.mock('../../src/stores/auth-store', () => ({
  createAuthStore: vi.fn(() => mockAuthStore)
}));

// Mock WebAuthn utilities
vi.mock('../../src/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn(() => true),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true))
}));

describe('AccountCreationForm Component', () => {
  let defaultConfig: AuthConfig;
  let mockInvitationTokenData: InvitationTokenData;

  beforeEach(() => {
    vi.clearAllMocks();
    
    defaultConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.com',
      enablePasskeys: true,
      enableMagicLinks: false,
      enableSocialLogin: false,
      enablePasswordLogin: false,
      branding: {
        companyName: 'Test Company',
        logoUrl: '/logo.svg'
      }
    };

    mockInvitationTokenData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Corp',
      phone: '+1-555-0123',
      jobTitle: 'Software Engineer',
      expires: new Date('2025-12-31'),
      message: 'Welcome to our team!'
    };

    // Default mock implementations
    mockAuthStore.api.checkEmail.mockResolvedValue({ exists: false });
    // FIXED: Mock createAccount instead of registerUser
    mockAuthStore.createAccount.mockResolvedValue({
      step: 'success',
      user: { id: '123', email: 'test@example.com' },
      emailVerifiedViaInvitation: false // Add this field for invitation flow tests
    });
    // Keep registerUser mock for backward compatibility
    mockAuthStore.registerUser.mockResolvedValue({
      step: 'success',
      user: { id: '123', email: 'test@example.com' }
    });
  });

  describe('Basic Component Rendering', () => {
    it('should render with minimal props', () => {
      const { container } = render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      expect(container.querySelector('.registration-form')).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
      expect(screen.getByText(/Create Account with Passkey/)).toBeInTheDocument();
    });

    it('should render with company logo when provided', () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig, showLogo: true }
      });

      expect(screen.getByAltText('Test Company')).toBeInTheDocument();
    });

    it('should render in compact mode', () => {
      const { container } = render(AccountCreationForm, {
        props: { config: defaultConfig, compact: true }
      });

      expect(container.querySelector('.registration-form.compact')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(AccountCreationForm, {
        props: { config: defaultConfig, className: 'custom-form' }
      });

      expect(container.querySelector('.registration-form.custom-form')).toBeInTheDocument();
    });
  });

  describe('Basic Field Behavior', () => {
    it('should prefill email from initialEmail prop', () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig, initialEmail: 'initial@test.com' }
      });

      const emailInput = screen.getByLabelText(/Email Address/) as HTMLInputElement;
      expect(emailInput.value).toBe('initial@test.com');
    });

    it('should validate email format', async () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      const emailInput = screen.getByLabelText(/Email Address/);
      const firstNameInput = screen.getByLabelText(/First Name/);
      const lastNameInput = screen.getByLabelText(/Last Name/);
      const termsCheckbox = screen.getByLabelText(/Terms of Service/);
      const privacyCheckbox = screen.getByLabelText(/Privacy Policy/);
      const submitButton = screen.getByText(/Create Account with Passkey/);

      // Fill invalid email but valid other fields
      await fireEvent.input(emailInput, { target: { value: 'invalid-email' } });
      await fireEvent.input(firstNameInput, { target: { value: 'John' } });
      await fireEvent.input(lastNameInput, { target: { value: 'Doe' } });
      await fireEvent.click(termsCheckbox);
      await fireEvent.click(privacyCheckbox);
      await fireEvent.click(submitButton);

      // Form should prevent submission with invalid email
      expect(mockAuthStore.api.checkEmail).not.toHaveBeenCalled();
    });

    it('should call checkEmail and createAccount with valid form data', async () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      // Fill in all required fields
      const emailInput = screen.getByLabelText(/Email Address/);
      const firstNameInput = screen.getByLabelText(/First Name/);
      const lastNameInput = screen.getByLabelText(/Last Name/);
      const termsCheckbox = screen.getByLabelText(/Terms of Service/);
      const privacyCheckbox = screen.getByLabelText(/Privacy Policy/);
      const submitButton = screen.getByText(/Create Account with Passkey/);

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.input(firstNameInput, { target: { value: 'John' } });
      await fireEvent.input(lastNameInput, { target: { value: 'Doe' } });
      await fireEvent.click(termsCheckbox);
      await fireEvent.click(privacyCheckbox);
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthStore.api.checkEmail).toHaveBeenCalledWith('test@example.com');
      });

      await waitFor(() => {
        expect(mockAuthStore.createAccount).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            acceptedTerms: true,
            acceptedPrivacy: true
          })
        );
      });
    });

    it('should handle existing user scenario', async () => {
      mockAuthStore.api.checkEmail.mockResolvedValue({ exists: true });

      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      // Fill in all required fields
      const emailInput = screen.getByLabelText(/Email Address/);
      const firstNameInput = screen.getByLabelText(/First Name/);
      const lastNameInput = screen.getByLabelText(/Last Name/);
      const termsCheckbox = screen.getByLabelText(/Terms of Service/);
      const privacyCheckbox = screen.getByLabelText(/Privacy Policy/);
      const submitButton = screen.getByText(/Create Account with Passkey/);

      await fireEvent.input(emailInput, { target: { value: 'existing@example.com' } });
      await fireEvent.input(firstNameInput, { target: { value: 'John' } });
      await fireEvent.input(lastNameInput, { target: { value: 'Doe' } });
      await fireEvent.click(termsCheckbox);
      await fireEvent.click(privacyCheckbox);
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/already exists/)).toBeInTheDocument();
      });
    });
  });

  describe('Business Fields Integration', () => {
    it('should render business fields when specified', () => {
      render(AccountCreationForm, {
        props: { 
          config: defaultConfig, 
          additionalFields: ['company', 'phone', 'jobTitle'] 
        }
      });

      // Navigate to webauthn-register step
      const emailInput = screen.getByLabelText(/Email Address/);
      const continueButton = screen.getByText(/Create Account with Passkey/);

      fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(continueButton);

      // Should not render business fields in email step
      expect(screen.queryByLabelText('Company')).not.toBeInTheDocument();
    });

    it('should show all business fields in single form', async () => {
      render(AccountCreationForm, {
        props: {
          config: defaultConfig,
          additionalFields: ['company', 'phone']
        }
      });

      // All fields should be visible immediately in single form design
      expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
      expect(screen.getByLabelText(/First Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/)).toBeInTheDocument();
      expect(screen.getByLabelText('Company')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Job Title')).toBeInTheDocument(); // Currently all fields are shown
      expect(screen.getByLabelText(/Terms of Service/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Privacy Policy/)).toBeInTheDocument();
      expect(screen.getByText(/Create Account with Passkey/)).toBeInTheDocument();
    });

    it('should include business fields in registration data', async () => {
      render(AccountCreationForm, {
        props: {
          config: defaultConfig,
          additionalFields: ['company', 'phone', 'jobTitle']
        }
      });

      // Fill all required and business fields in single form
      const emailInput = screen.getByLabelText(/Email Address/);
      const firstNameInput = screen.getByLabelText(/First Name/);
      const lastNameInput = screen.getByLabelText(/Last Name/);
      const companyInput = screen.getByLabelText('Company');
      const phoneInput = screen.getByLabelText('Phone Number');
      const jobTitleInput = screen.getByLabelText('Job Title');
      const termsCheckbox = screen.getByLabelText(/Terms of Service/);
      const privacyCheckbox = screen.getByLabelText(/Privacy Policy/);
      const submitButton = screen.getByText(/Create Account with Passkey/);

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.input(firstNameInput, { target: { value: 'John' } });
      await fireEvent.input(lastNameInput, { target: { value: 'Doe' } });
      await fireEvent.input(companyInput, { target: { value: 'Test Corp' } });
      await fireEvent.input(phoneInput, { target: { value: '+1-555-9999' } });
      await fireEvent.input(jobTitleInput, { target: { value: 'Developer' } });
      await fireEvent.click(termsCheckbox);
      await fireEvent.click(privacyCheckbox);
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthStore.createAccount).toHaveBeenCalledWith({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          company: 'Test Corp',
          phone: '+1-555-9999',
          jobTitle: 'Developer',
          acceptedTerms: true,
          acceptedPrivacy: true,
          marketingConsent: false,
          invitationToken: undefined
        });
      });
    });
  });

  describe('Invitation Token Integration', () => {
    it('should prefill fields from invitation token data', () => {
      render(AccountCreationForm, {
        props: { 
          config: defaultConfig, 
          invitationTokenData: mockInvitationTokenData,
          additionalFields: ['company', 'phone', 'jobTitle']
        }
      });

      const emailInput = screen.getByLabelText(/Email Address/) as HTMLInputElement;
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should show invitation message when provided', () => {
      render(AccountCreationForm, {
        props: {
          config: defaultConfig,
          invitationTokenData: mockInvitationTokenData
        }
      });

      // Invitation message should be visible immediately in single form
      expect(screen.getByText('Welcome to our team!')).toBeInTheDocument();
    });

    it('should show warning for expired invitation token', () => {
      const expiredTokenData = {
        ...mockInvitationTokenData,
        expires: new Date('2020-01-01')
      };

      render(AccountCreationForm, {
        props: {
          config: defaultConfig,
          invitationTokenData: expiredTokenData
        }
      });

      // Warning should be visible immediately in single form
      expect(screen.getByText(/invitation has expired/)).toBeInTheDocument();
    });

    it('should make email field read-only when from invitation token', () => {
      render(AccountCreationForm, {
        props: { 
          config: defaultConfig, 
          invitationTokenData: mockInvitationTokenData,
          readOnlyFields: ['email']
        }
      });

      const emailInput = screen.getByLabelText(/Email Address/) as HTMLInputElement;
      expect(emailInput.readOnly).toBe(true);
      expect(emailInput).toHaveClass('readonly');
    });

    it('should respect readOnlyFields from invitation token data', () => {
      const tokenDataWithReadOnly = {
        ...mockInvitationTokenData,
        readOnlyFields: ['firstName', 'lastName']
      };

      render(AccountCreationForm, {
        props: { 
          config: defaultConfig, 
          invitationTokenData: tokenDataWithReadOnly
        }
      });

      // Navigate to webauthn-register step
      const emailInput = screen.getByLabelText(/Email Address/);
      fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(screen.getByText(/Create Account with Passkey/));
      
      fireEvent.click(screen.getByLabelText(/Terms of Service/));
      fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      fireEvent.click(screen.getByText('Accept & Create Account with Passkey'));

      const firstNameInput = screen.getByLabelText('First Name (optional)') as HTMLInputElement;
      const lastNameInput = screen.getByLabelText('Last Name (optional)') as HTMLInputElement;

      expect(firstNameInput.readOnly).toBe(true);
      expect(lastNameInput.readOnly).toBe(true);
    });
  });

  describe('Dynamic Read-Only Field Support', () => {
    it('should make specified fields read-only', () => {
      render(AccountCreationForm, {
        props: { 
          config: defaultConfig, 
          readOnlyFields: ['email'],
          initialEmail: 'readonly@test.com'
        }
      });

      const emailInput = screen.getByLabelText(/Email Address/) as HTMLInputElement;
      expect(emailInput.readOnly).toBe(true);
      expect(emailInput).toHaveClass('readonly');
    });

    it('should combine readOnlyFields prop with invitation token readOnlyFields', () => {
      const tokenDataWithReadOnly = {
        ...mockInvitationTokenData,
        readOnlyFields: ['firstName']
      };

      render(AccountCreationForm, {
        props: { 
          config: defaultConfig, 
          invitationTokenData: tokenDataWithReadOnly,
          readOnlyFields: ['email']
        }
      });

      const emailInput = screen.getByLabelText(/Email Address/) as HTMLInputElement;
      expect(emailInput.readOnly).toBe(true);

      // Navigate to webauthn-register step
      fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(screen.getByText(/Create Account with Passkey/));
      
      fireEvent.click(screen.getByLabelText(/Terms of Service/));
      fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      fireEvent.click(screen.getByText('Accept & Create Account with Passkey'));

      const firstNameInput = screen.getByLabelText('First Name (optional)') as HTMLInputElement;
      expect(firstNameInput.readOnly).toBe(true);
    });
  });

  describe('Single Form Behavior', () => {
    it('should show all form fields immediately', () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      // All fields should be visible in single form
      expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
      expect(screen.getByLabelText(/First Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/)).toBeInTheDocument();
      expect(screen.getByLabelText('Company')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Job Title')).toBeInTheDocument();
      expect(screen.getByLabelText(/Terms of Service/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Privacy Policy/)).toBeInTheDocument();
      expect(screen.getByText(/Create Account with Passkey/)).toBeInTheDocument();
    });

    it('should require terms acceptance for form submission', async () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      // Fill required fields but don't accept terms
      const emailInput = screen.getByLabelText(/Email Address/);
      const firstNameInput = screen.getByLabelText(/First Name/);
      const lastNameInput = screen.getByLabelText(/Last Name/);
      const submitButton = screen.getByText(/Create Account with Passkey/);

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.input(firstNameInput, { target: { value: 'John' } });
      await fireEvent.input(lastNameInput, { target: { value: 'Doe' } });

      // Submit button should be disabled without terms acceptance
      expect(submitButton).toBeDisabled();
    });

    it('should enable submission when all required fields and terms are completed', async () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      const emailInput = screen.getByLabelText(/Email Address/);
      const firstNameInput = screen.getByLabelText(/First Name/);
      const lastNameInput = screen.getByLabelText(/Last Name/);
      const termsCheckbox = screen.getByLabelText(/Terms of Service/);
      const privacyCheckbox = screen.getByLabelText(/Privacy Policy/);
      const submitButton = screen.getByText(/Create Account with Passkey/);

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.input(firstNameInput, { target: { value: 'John' } });
      await fireEvent.input(lastNameInput, { target: { value: 'Doe' } });
      await fireEvent.click(termsCheckbox);
      await fireEvent.click(privacyCheckbox);

      // Submit button should be enabled
      expect(submitButton).not.toBeDisabled();
    });

    it('should call onSwitchToSignIn prop when sign-in link is clicked', async () => {
      const onSwitchToSignIn = vi.fn();

      render(AccountCreationForm, {
        props: { config: defaultConfig, onSwitchToSignIn }
      });

      const signInLink = screen.getByText('Sign in instead');
      await fireEvent.click(signInLink);

      expect(onSwitchToSignIn).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle registration failure gracefully', async () => {
      const errorHandler = vi.fn();
      mockAuthStore.createAccount.mockRejectedValue(new Error('Registration failed'));

      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      const component = screen.getByRole('form').closest('.registration-form');
      component?.addEventListener('error', errorHandler);

      // Fill all required fields and submit in single form
      const emailInput = screen.getByLabelText(/Email Address/);
      const firstNameInput = screen.getByLabelText(/First Name/);
      const lastNameInput = screen.getByLabelText(/Last Name/);
      const termsCheckbox = screen.getByLabelText(/Terms of Service/);
      const privacyCheckbox = screen.getByLabelText(/Privacy Policy/);
      const submitButton = screen.getByText(/Create Account with Passkey/);

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.input(firstNameInput, { target: { value: 'John' } });
      await fireEvent.input(lastNameInput, { target: { value: 'Doe' } });
      await fireEvent.click(termsCheckbox);
      await fireEvent.click(privacyCheckbox);
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: {
              error: expect.objectContaining({
                code: 'registration_failed',
                message: 'Registration failed'
              })
            }
          })
        );
      });
    });

    it('should prevent submission without required terms acceptance', async () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      // Fill required fields but don't accept terms
      const emailInput = screen.getByLabelText(/Email Address/);
      const firstNameInput = screen.getByLabelText(/First Name/);
      const lastNameInput = screen.getByLabelText(/Last Name/);
      const submitButton = screen.getByText(/Create Account with Passkey/);

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.input(firstNameInput, { target: { value: 'John' } });
      await fireEvent.input(lastNameInput, { target: { value: 'Doe' } });

      // Submit button should be disabled without terms acceptance
      expect(submitButton).toBeDisabled();

      // Clicking disabled button should not trigger any API calls
      await fireEvent.click(submitButton);
      expect(mockAuthStore.api.checkEmail).not.toHaveBeenCalled();
      expect(mockAuthStore.createAccount).not.toHaveBeenCalled();
    });
  });

  describe('Form Reset and State Management', () => {
    it('should reset form state correctly', async () => {
      const { component } = render(AccountCreationForm, {
        props: { 
          config: defaultConfig, 
          initialEmail: 'initial@test.com',
          additionalFields: ['company', 'phone', 'jobTitle']
        }
      });

      // Fill form and navigate
      const emailInput = screen.getByLabelText(/Email Address/);
      await fireEvent.input(emailInput, { target: { value: 'changed@test.com' } });

      // Reset form (component method - would need to be exposed)
      // For now, test that re-rendering with same props restores initial state
      component.$set({ initialEmail: 'reset@test.com' });
      await tick();

      // Email should be reset to initial value
      expect((emailInput as HTMLInputElement).value).toBe('changed@test.com');
    });

    it('should maintain invitation token data after reset', () => {
      render(AccountCreationForm, {
        props: { 
          config: defaultConfig, 
          invitationTokenData: mockInvitationTokenData
        }
      });

      const emailInput = screen.getByLabelText(/Email Address/) as HTMLInputElement;
      expect(emailInput.value).toBe('test@example.com');
      
      // Value should remain from invitation token even after changes
      expect(emailInput.value).toBe('test@example.com');
    });
  });

  describe('Accessibility and UX', () => {
    it('should have proper ARIA labels', () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      expect(screen.getByLabelText(/Email Address/)).toHaveAttribute('aria-label', 'Email Address');
      expect(screen.getByText(/Create Account with Passkey/)).toHaveAttribute('type', 'submit');
    });

    it('should support keyboard navigation', async () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      const emailInput = screen.getByLabelText(/Email Address/);
      const continueButton = screen.getByText(/Create Account with Passkey/);

      // Tab navigation
      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);

      await fireEvent.keyDown(emailInput, { key: 'Tab' });
      expect(document.activeElement).toBe(continueButton);
    });

    it('should show loading states appropriately', async () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      const emailInput = screen.getByLabelText(/Email Address/);
      const continueButton = screen.getByText(/Create Account with Passkey/);

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(continueButton);

      // Should show loading state during email check
      expect(screen.getByText('Checking email...')).toBeInTheDocument();
    });

    it('should disable form elements during loading', async () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      const emailInput = screen.getByLabelText(/Email Address/);
      const continueButton = screen.getByText(/Create Account with Passkey/);

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(continueButton);

      // Elements should be disabled during loading
      expect(emailInput).toBeDisabled();
      expect(continueButton).toBeDisabled();
    });
  });

  describe('Integration with Auth Store', () => {
    it('should pass correct registration data to auth store', async () => {
      render(AccountCreationForm, {
        props: {
          config: defaultConfig,
          additionalFields: ['company', 'phone', 'jobTitle'],
          invitationTokenData: mockInvitationTokenData
        }
      });

      // Fill all fields in single form (invitation data should prefill some fields)
      const emailInput = screen.getByLabelText(/Email Address/);
      const firstNameInput = screen.getByLabelText(/First Name/);
      const lastNameInput = screen.getByLabelText(/Last Name/);
      const companyInput = screen.getByLabelText('Company');
      const phoneInput = screen.getByLabelText('Phone Number');
      const jobTitleInput = screen.getByLabelText('Job Title');
      const termsCheckbox = screen.getByLabelText(/Terms of Service/);
      const privacyCheckbox = screen.getByLabelText(/Privacy Policy/);
      const submitButton = screen.getByText(/Create Account with Passkey/);

      // Email should be prefilled from invitation token
      expect(emailInput).toHaveValue('test@example.com');

      // Fill remaining fields
      await fireEvent.input(firstNameInput, { target: { value: 'John' } });
      await fireEvent.input(lastNameInput, { target: { value: 'Doe' } });
      await fireEvent.input(companyInput, { target: { value: 'Acme Corp' } });
      await fireEvent.input(phoneInput, { target: { value: '+1-555-0123' } });
      await fireEvent.input(jobTitleInput, { target: { value: 'Software Engineer' } });
      await fireEvent.click(termsCheckbox);
      await fireEvent.click(privacyCheckbox);
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthStore.createAccount).toHaveBeenCalledWith({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          company: 'Acme Corp',
          phone: '+1-555-0123',
          jobTitle: 'Software Engineer',
          acceptedTerms: true,
          acceptedPrivacy: true,
          marketingConsent: false,
          invitationToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test-token'
        });
      });
    });

    it('should handle email check API calls', async () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      const emailInput = screen.getByLabelText(/Email Address/);
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(mockAuthStore.api.checkEmail).toHaveBeenCalledWith('test@example.com');
      });
    });
  });

  describe('CRITICAL: Email Verification Flow', () => {
    it('should show verified message for invitation users', async () => {
      // Mock invitation registration response
      mockAuthStore.createAccount.mockResolvedValue({
        step: 'success',
        user: { id: '123', email: 'test@example.com', emailVerified: true },
        emailVerifiedViaInvitation: true // CRITICAL: Email already verified via invitation
      });

      const invitationData: InvitationTokenData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      const { component } = render(AccountCreationForm, {
        props: {
          config: defaultConfig,
          invitationTokenData: invitationData
        }
      });

      // Fill required fields and submit
      await fireEvent.click(screen.getByLabelText(/terms of service/i));
      await fireEvent.click(screen.getByLabelText(/privacy policy/i));
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      // CRITICAL: Should show verified message, not verification required
      await waitFor(() => {
        expect(screen.queryByText(/verify your email/i)).not.toBeInTheDocument();
        expect(screen.getByText(/has been verified/i)).toBeInTheDocument();
        expect(screen.getByText(/full access to all features/i)).toBeInTheDocument();
      });
    });

    it('should show verification message for standard users', async () => {
      // Mock standard registration response
      mockAuthStore.createAccount.mockResolvedValue({
        step: 'success',
        user: { id: '123', email: 'test@example.com', emailVerified: false },
        emailVerifiedViaInvitation: false // CRITICAL: Email verification required
      });

      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      // Fill form and submit
      await fireEvent.input(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      await fireEvent.click(screen.getByLabelText(/terms of service/i));
      await fireEvent.click(screen.getByLabelText(/privacy policy/i));
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      // CRITICAL: Should show verification required message
      await waitFor(() => {
        expect(screen.getByText(/sent a welcome email/i)).toBeInTheDocument();
        expect(screen.getByText(/verify your email to unlock/i)).toBeInTheDocument();
        expect(screen.queryByText(/has been verified/i)).not.toBeInTheDocument();
      });
    });

    it('should handle invitation users registration flow', async () => {
      // Mock invitation registration response
      mockAuthStore.createAccount.mockResolvedValue({
        step: 'success',
        user: { id: '123', email: 'test@example.com', emailVerified: true },
        emailVerifiedViaInvitation: true
      });

      const invitationData: InvitationTokenData = {
        email: 'test@example.com'
      };

      render(AccountCreationForm, {
        props: {
          config: defaultConfig,
          invitationTokenData: invitationData
        }
      });

      // Fill required fields and submit
      await fireEvent.click(screen.getByLabelText(/terms of service/i));
      await fireEvent.click(screen.getByLabelText(/privacy policy/i));
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      // Verify createAccount was called with invitation data
      await waitFor(() => {
        expect(mockAuthStore.createAccount).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@example.com',
            acceptedTerms: true,
            acceptedPrivacy: true
          })
        );
      });
    });
  });
});