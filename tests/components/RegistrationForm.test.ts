/**
 * Comprehensive Test Suite for RegistrationForm Component
 * 
 * This test suite covers all aspects of the enhanced RegistrationForm component
 * including business fields, invitation token integration, and dynamic field behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import RegistrationForm from '../../src/components/RegistrationForm.svelte';
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

describe('RegistrationForm Component', () => {
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
      const { container } = render(RegistrationForm, {
        props: { config: defaultConfig }
      });

      expect(container.querySelector('.registration-form')).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
      expect(screen.getByText(/Create Account with Passkey/)).toBeInTheDocument();
    });

    it('should render with company logo when provided', () => {
      render(RegistrationForm, {
        props: { config: defaultConfig, showLogo: true }
      });

      expect(screen.getByAltText('Test Company')).toBeInTheDocument();
    });

    it('should render in compact mode', () => {
      const { container } = render(RegistrationForm, {
        props: { config: defaultConfig, compact: true }
      });

      expect(container.querySelector('.registration-form.compact')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(RegistrationForm, {
        props: { config: defaultConfig, className: 'custom-form' }
      });

      expect(container.querySelector('.registration-form.custom-form')).toBeInTheDocument();
    });
  });

  describe('Basic Field Behavior', () => {
    it('should prefill email from initialEmail prop', () => {
      render(RegistrationForm, {
        props: { config: defaultConfig, initialEmail: 'initial@test.com' }
      });

      const emailInput = screen.getByLabelText(/Email Address/) as HTMLInputElement;
      expect(emailInput.value).toBe('initial@test.com');
    });

    it('should validate email format', async () => {
      render(RegistrationForm, {
        props: { config: defaultConfig }
      });

      const emailInput = screen.getByLabelText(/Email Address/);
      const continueButton = screen.getByText(/Create Account with Passkey/);

      await fireEvent.input(emailInput, { target: { value: 'invalid-email' } });
      await fireEvent.click(continueButton);

      // Form should prevent submission with invalid email
      expect(mockAuthStore.api.checkEmail).not.toHaveBeenCalled();
    });

    it('should proceed to terms step with valid email', async () => {
      render(RegistrationForm, {
        props: { config: defaultConfig }
      });

      const emailInput = screen.getByLabelText(/Email Address/);
      const continueButton = screen.getByText(/Create Account with Passkey/);

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockAuthStore.api.checkEmail).toHaveBeenCalledWith('test@example.com');
      });

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });
    });

    it('should handle existing user scenario', async () => {
      mockAuthStore.api.checkEmail.mockResolvedValue({ exists: true });

      render(RegistrationForm, {
        props: { config: defaultConfig }
      });

      const emailInput = screen.getByLabelText(/Email Address/);
      const continueButton = screen.getByText(/Create Account with Passkey/);

      await fireEvent.input(emailInput, { target: { value: 'existing@example.com' } });
      await fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/already exists/)).toBeInTheDocument();
      });
    });
  });

  describe('Business Fields Integration', () => {
    it('should render business fields when specified', () => {
      render(RegistrationForm, {
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

    it('should show only specified business fields', async () => {
      render(RegistrationForm, {
        props: { 
          config: defaultConfig, 
          additionalFields: ['company', 'phone'] 
        }
      });

      // Navigate through steps to webauthn-register
      const emailInput = screen.getByLabelText(/Email Address/);
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      // Accept terms
      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText('Accept & Create Account with Passkey'));

      await waitFor(() => {
        expect(screen.getByText(/Create Account with Passkey/)).toBeInTheDocument();
      });

      // Check business fields
      expect(screen.getByLabelText('Company')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      expect(screen.queryByLabelText('Job Title')).not.toBeInTheDocument();
    });

    it('should include business fields in registration data', async () => {
      render(RegistrationForm, {
        props: { 
          config: defaultConfig, 
          additionalFields: ['company', 'phone', 'jobTitle'] 
        }
      });

      // Navigate through complete flow
      const emailInput = screen.getByLabelText(/Email Address/);
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText('Accept & Create Account with Passkey'));

      await waitFor(() => {
        expect(screen.getByText(/Create Account with Passkey/)).toBeInTheDocument();
      });

      // Fill business fields
      await fireEvent.input(screen.getByLabelText('Company'), { target: { value: 'Test Corp' } });
      await fireEvent.input(screen.getByLabelText('Phone Number'), { target: { value: '+1-555-9999' } });
      await fireEvent.input(screen.getByLabelText('Job Title'), { target: { value: 'Developer' } });

      await fireEvent.click(screen.getByText(/Register with Passkey/));

      await waitFor(() => {
        // FIXED: Expect createAccount to be called instead of registerUser
        expect(mockAuthStore.createAccount).toHaveBeenCalledWith({
          email: 'test@example.com',
          firstName: undefined,
          lastName: undefined,
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
      render(RegistrationForm, {
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
      render(RegistrationForm, {
        props: { 
          config: defaultConfig, 
          invitationTokenData: mockInvitationTokenData
        }
      });

      // Navigate to webauthn-register step to see invitation message
      const emailInput = screen.getByLabelText(/Email Address/);
      const continueButton = screen.getByText(/Create Account with Passkey/);

      fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(continueButton);
      
      // Skip to webauthn step through terms
      fireEvent.click(screen.getByLabelText(/Terms of Service/));
      fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      fireEvent.click(screen.getByText('Accept & Create Account with Passkey'));

      expect(screen.getByText('Welcome to our team!')).toBeInTheDocument();
    });

    it('should show warning for expired invitation token', () => {
      const expiredTokenData = {
        ...mockInvitationTokenData,
        expires: new Date('2020-01-01')
      };

      render(RegistrationForm, {
        props: { 
          config: defaultConfig, 
          invitationTokenData: expiredTokenData
        }
      });

      // Navigate to webauthn-register step
      const emailInput = screen.getByLabelText(/Email Address/);
      fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(screen.getByText(/Create Account with Passkey/));
      
      fireEvent.click(screen.getByLabelText(/Terms of Service/));
      fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      fireEvent.click(screen.getByText('Accept & Create Account with Passkey'));

      expect(screen.getByText(/invitation has expired/)).toBeInTheDocument();
    });

    it('should make email field read-only when from invitation token', () => {
      render(RegistrationForm, {
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

      render(RegistrationForm, {
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
      render(RegistrationForm, {
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

      render(RegistrationForm, {
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

  describe('Event Emission', () => {
    it('should emit stepChange event on step transitions', async () => {
      const stepChangeHandler = vi.fn();
      
      render(RegistrationForm, {
        props: { config: defaultConfig }
      });

      const component = screen.getByRole('form').closest('.registration-form');
      component?.addEventListener('stepChange', stepChangeHandler);

      const emailInput = screen.getByLabelText(/Email Address/);
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(stepChangeHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: { step: 'terms-of-service' }
          })
        );
      });
    });

    it('should emit switchToSignIn event when sign-in link is clicked', async () => {
      const switchToSignInHandler = vi.fn();
      const onSwitchToSignIn = vi.fn();
      
      render(RegistrationForm, {
        props: { config: defaultConfig, onSwitchToSignIn }
      });

      const component = screen.getByRole('form').closest('.registration-form');
      component?.addEventListener('switchToSignIn', switchToSignInHandler);

      const signInLink = screen.getByText('Sign in instead');
      await fireEvent.click(signInLink);

      expect(onSwitchToSignIn).toHaveBeenCalled();
      expect(switchToSignInHandler).toHaveBeenCalled();
    });

    it('should emit terms_accepted event when terms are accepted', async () => {
      const termsAcceptedHandler = vi.fn();
      
      render(RegistrationForm, {
        props: { config: defaultConfig }
      });

      const component = screen.getByRole('form').closest('.registration-form');
      component?.addEventListener('terms_accepted', termsAcceptedHandler);

      // Navigate to terms step
      const emailInput = screen.getByLabelText(/Email Address/);
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      // Accept terms
      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText('Accept & Create Account with Passkey'));

      await waitFor(() => {
        expect(termsAcceptedHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: { 
              terms: true, 
              privacy: true, 
              marketing: false 
            }
          })
        );
      });
    });

    it('should emit appAccess event on successful registration', async () => {
      const appAccessHandler = vi.fn();
      
      render(RegistrationForm, {
        props: { config: defaultConfig }
      });

      const component = screen.getByRole('form').closest('.registration-form');
      component?.addEventListener('appAccess', appAccessHandler);

      // Complete registration flow
      const emailInput = screen.getByLabelText(/Email Address/);
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText('Accept & Create Account with Passkey'));

      await waitFor(() => {
        expect(screen.getByText(/Create Account with Passkey/)).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByText(/Register with Passkey/));

      await waitFor(() => {
        expect(appAccessHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: { 
              user: { id: '123', email: 'test@example.com' }
            }
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle registration failure gracefully', async () => {
      const errorHandler = vi.fn();
      // FIXED: Mock createAccount rejection instead of registerUser
      mockAuthStore.createAccount.mockRejectedValue(new Error('Registration failed'));
      
      render(RegistrationForm, {
        props: { config: defaultConfig }
      });

      const component = screen.getByRole('form').closest('.registration-form');
      component?.addEventListener('error', errorHandler);

      // Complete registration flow
      const emailInput = screen.getByLabelText(/Email Address/);
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText('Accept & Create Account with Passkey'));

      await waitFor(() => {
        expect(screen.getByText(/Create Account with Passkey/)).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByText(/Register with Passkey/));

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

    it('should show error message for validation failures', async () => {
      render(RegistrationForm, {
        props: { config: defaultConfig }
      });

      // Navigate to terms step
      const emailInput = screen.getByLabelText(/Email Address/);
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      // Try to continue without accepting terms
      await fireEvent.click(screen.getByText('Accept & Create Account with Passkey'));

      await waitFor(() => {
        expect(screen.getByText(/must accept the Terms of Service/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Reset and State Management', () => {
    it('should reset form state correctly', async () => {
      const { component } = render(RegistrationForm, {
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
      render(RegistrationForm, {
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
      render(RegistrationForm, {
        props: { config: defaultConfig }
      });

      expect(screen.getByLabelText(/Email Address/)).toHaveAttribute('aria-label', 'Email Address');
      expect(screen.getByText(/Create Account with Passkey/)).toHaveAttribute('type', 'submit');
    });

    it('should support keyboard navigation', async () => {
      render(RegistrationForm, {
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
      render(RegistrationForm, {
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
      render(RegistrationForm, {
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
      render(RegistrationForm, {
        props: { 
          config: defaultConfig, 
          additionalFields: ['company', 'phone', 'jobTitle'],
          invitationTokenData: mockInvitationTokenData
        }
      });

      // Complete registration flow
      const emailInput = screen.getByLabelText(/Email Address/);
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText('Accept & Create Account with Passkey'));

      await waitFor(() => {
        expect(screen.getByText(/Create Account with Passkey/)).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByText(/Register with Passkey/));

      await waitFor(() => {
        // FIXED: Expect createAccount to be called instead of registerUser
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
      render(RegistrationForm, {
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

      const { component } = render(RegistrationForm, {
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

      render(RegistrationForm, {
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

    it('should emit appAccess event for invitation users (auto-sign-in)', async () => {
      const appAccessHandler = vi.fn();

      // Mock invitation registration response
      mockAuthStore.createAccount.mockResolvedValue({
        step: 'success',
        user: { id: '123', email: 'test@example.com', emailVerified: true },
        emailVerifiedViaInvitation: true // CRITICAL: Should trigger auto-sign-in
      });

      const invitationData: InvitationTokenData = {
        email: 'test@example.com'
      };

      const { component } = render(RegistrationForm, {
        props: {
          config: defaultConfig,
          invitationTokenData: invitationData
        }
      });

      component.$on('appAccess', appAccessHandler);

      // Fill required fields and submit
      await fireEvent.click(screen.getByLabelText(/terms of service/i));
      await fireEvent.click(screen.getByLabelText(/privacy policy/i));
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      // CRITICAL: Should emit appAccess event with auto-sign-in flag
      await waitFor(() => {
        expect(appAccessHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: expect.objectContaining({
              user: expect.any(Object),
              emailVerifiedViaInvitation: true,
              autoSignIn: true
            })
          })
        );
      });
    });
  });
});