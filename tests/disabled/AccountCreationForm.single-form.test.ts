/**
 * AccountCreationForm Component Tests - Single Form Design
 *
 * Tests for the simplified single-form AccountCreationForm component
 * after removal of multi-step functionality.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountCreationForm from '../../src/components/AccountCreationForm.svelte';
import type { AuthConfig, InvitationTokenData } from '../../src/types';

// Mock the auth store with subscription support
const mockSubscriptionCallbacks: Array<(state: any) => void> = [];
const mockAuthStore = {
  createAccount: vi.fn(),
  api: {
    checkEmail: vi.fn()
  },
  subscribe: vi.fn((callback) => {
    mockSubscriptionCallbacks.push(callback);
    return () => {
      const index = mockSubscriptionCallbacks.indexOf(callback);
      if (index > -1) mockSubscriptionCallbacks.splice(index, 1);
    };
  }),
  // Helper to trigger state changes for testing
  _triggerStateChange: (state: any) => {
    mockSubscriptionCallbacks.forEach((cb) => cb(state));
  }
};

// Mock the createAuthStore function
vi.mock('../../src/stores', () => ({
  createAuthStore: vi.fn(() => {
    console.log('🔧 createAuthStore mock called');
    return mockAuthStore;
  })
}));

// Mock WebAuthn utilities
vi.mock('../../src/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn(() => true),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true))
}));

describe('AccountCreationForm - Single Form Design', () => {
  let defaultConfig: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    defaultConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.com',
      enablePasskeys: true,
      enableMagicPins: false,
      branding: {
        companyName: 'Test Company',
        logoUrl: '/logo.svg'
      }
    };

    // Mock successful API responses
    mockAuthStore.api.checkEmail.mockResolvedValue({ exists: false });
    mockAuthStore.createAccount.mockResolvedValue({
      step: 'success',
      user: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User'
      },
      accessToken: 'test-token'
    });
  });

  describe('Basic Rendering', () => {
    it('should render single registration form', () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      // Should show all form fields in one form
      expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
      expect(screen.getByLabelText(/First Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Terms of Service/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Privacy Policy/)).toBeInTheDocument();
      expect(screen.getByText(/Create Account with Passkey/)).toBeInTheDocument();
    });

    it('should show company logo when configured', () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      const logo = screen.getByAltText('Test Company');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/logo.svg');
    });
  });

  describe('Form Validation', () => {
    it('should require all mandatory fields', async () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      const submitButton = screen.getByText(/Create Account with Passkey/);
      await fireEvent.click(submitButton);

      // Should not call API with empty required fields
      expect(mockAuthStore.api.checkEmail).not.toHaveBeenCalled();
    });

    it('should validate email format', () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      const emailInput = screen.getByLabelText(/Email Address/);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
    });

    it('should require terms and privacy acceptance', () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      const termsCheckbox = screen.getByLabelText(/Terms of Service/);
      const privacyCheckbox = screen.getByLabelText(/Privacy Policy/);

      expect(termsCheckbox).toHaveAttribute('required');
      expect(privacyCheckbox).toHaveAttribute('required');
    });
  });

  describe('Registration Flow', () => {
    it('should successfully register with valid data', async () => {
      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      // Fill all required fields
      await fireEvent.input(screen.getByLabelText(/Email Address/), {
        target: { value: 'test@example.com' }
      });
      await fireEvent.input(screen.getByLabelText(/First Name/), {
        target: { value: 'John' }
      });
      await fireEvent.input(screen.getByLabelText(/Last Name/), {
        target: { value: 'Doe' }
      });
      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));

      // Submit form
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(mockAuthStore.api.checkEmail).toHaveBeenCalledWith('test@example.com');
        expect(mockAuthStore.createAccount).toHaveBeenCalledWith({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          acceptedTerms: true,
          acceptedPrivacy: true,
          marketingConsent: false,
          invitationToken: undefined
        });
      });
    });

    it('should handle existing user error', async () => {
      mockAuthStore.api.checkEmail.mockResolvedValue({ exists: true });

      render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      // Fill required fields and submit
      await fireEvent.input(screen.getByLabelText(/Email Address/), {
        target: { value: 'existing@example.com' }
      });
      await fireEvent.input(screen.getByLabelText(/First Name/), {
        target: { value: 'John' }
      });
      await fireEvent.input(screen.getByLabelText(/Last Name/), {
        target: { value: 'Doe' }
      });
      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(screen.getByText(/account with this email already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Invitation Token Support', () => {
    it('should prefill form with invitation data', async () => {
      const invitationData: InvitationTokenData = {
        email: 'invited@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        company: 'ACME Corp'
      };

      render(AccountCreationForm, {
        props: {
          config: defaultConfig,
          invitationTokenData: invitationData,
          invitationToken: 'jwt-token-string'
        }
      });

      const emailInput = screen.getByLabelText(/Email Address/) as HTMLInputElement;
      const firstNameInput = screen.getByLabelText(/First Name/) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/Last Name/) as HTMLInputElement;

      // Wait for onMount to complete
      await waitFor(() => {
        expect(emailInput.value).toBe('invited@example.com');
        expect(firstNameInput.value).toBe('Jane');
        expect(lastNameInput.value).toBe('Smith');
      });
    });

    it('should pass invitation token in registration request', async () => {
      const invitationData: InvitationTokenData = {
        email: 'invited@example.com',
        firstName: 'Jane',
        lastName: 'Smith'
      };

      render(AccountCreationForm, {
        props: {
          config: defaultConfig,
          invitationTokenData: invitationData,
          invitationToken: 'jwt-token-string'
        }
      });

      // Accept terms and submit
      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(mockAuthStore.createAccount).toHaveBeenCalledWith(
          expect.objectContaining({
            invitationToken: 'jwt-token-string'
          })
        );
      });
    });
  });

  describe('Event Emission', () => {
    it('should emit success event on successful registration', async () => {
      const successHandler = vi.fn();

      const { component } = render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      component.$on('success', successHandler);

      // Complete registration
      await fireEvent.input(screen.getByLabelText(/Email Address/), {
        target: { value: 'test@example.com' }
      });
      await fireEvent.input(screen.getByLabelText(/First Name/), {
        target: { value: 'John' }
      });
      await fireEvent.input(screen.getByLabelText(/Last Name/), {
        target: { value: 'Doe' }
      });
      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(successHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: expect.objectContaining({
              user: expect.any(Object)
            })
          })
        );
      });
    });

    it('should emit appAccess event only after auth store confirms authentication', async () => {
      const appAccessHandler = vi.fn();

      const { component } = render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      component.$on('appAccess', appAccessHandler);

      // Complete registration
      await fireEvent.input(screen.getByLabelText(/Email Address/), {
        target: { value: 'test@example.com' }
      });
      await fireEvent.input(screen.getByLabelText(/First Name/), {
        target: { value: 'John' }
      });
      await fireEvent.input(screen.getByLabelText(/Last Name/), {
        target: { value: 'Doe' }
      });
      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      // appAccess should not be emitted immediately
      expect(appAccessHandler).not.toHaveBeenCalled();

      // Simulate auth store state change to authenticated
      const mockUser = {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User'
      };

      mockAuthStore._triggerStateChange({
        state: 'authenticated',
        user: mockUser,
        accessToken: 'test-token'
      });

      // Now appAccess should be emitted
      await waitFor(() => {
        expect(appAccessHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: expect.objectContaining({
              user: expect.any(Object)
            })
          })
        );
      });
    });

    it('should subscribe to auth store state changes', async () => {
      const { component } = render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      // Wait a bit for onMount to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify auth store subscription was called
      expect(mockAuthStore.subscribe).toHaveBeenCalled();
    });

    it('should not emit appAccess if auth store state is not authenticated', async () => {
      const appAccessHandler = vi.fn();

      const { component } = render(AccountCreationForm, {
        props: { config: defaultConfig }
      });

      component.$on('appAccess', appAccessHandler);

      // Complete registration successfully
      await fireEvent.input(screen.getByLabelText(/Email Address/), {
        target: { value: 'test@example.com' }
      });
      await fireEvent.input(screen.getByLabelText(/First Name/), {
        target: { value: 'John' }
      });
      await fireEvent.input(screen.getByLabelText(/Last Name/), {
        target: { value: 'Doe' }
      });
      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      // Simulate auth store state change to error
      mockAuthStore._triggerStateChange({
        state: 'error',
        error: 'Registration failed'
      });

      // appAccess should not be emitted for error state
      expect(appAccessHandler).not.toHaveBeenCalled();
    });
  });

  describe('Additional Fields', () => {
    it('should show additional business fields when requested', () => {
      render(AccountCreationForm, {
        props: {
          config: defaultConfig,
          additionalFields: ['company', 'phone', 'jobTitle']
        }
      });

      expect(screen.getByLabelText(/Company/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Job Title/)).toBeInTheDocument();
    });

    it('should include additional fields in registration data', async () => {
      render(AccountCreationForm, {
        props: {
          config: defaultConfig,
          additionalFields: ['company', 'phone', 'jobTitle']
        }
      });

      // Fill all fields including additional ones
      await fireEvent.input(screen.getByLabelText(/Email Address/), {
        target: { value: 'test@example.com' }
      });
      await fireEvent.input(screen.getByLabelText(/First Name/), {
        target: { value: 'John' }
      });
      await fireEvent.input(screen.getByLabelText(/Last Name/), {
        target: { value: 'Doe' }
      });
      await fireEvent.input(screen.getByLabelText(/Company/), {
        target: { value: 'Test Corp' }
      });
      await fireEvent.input(screen.getByLabelText(/Phone/), {
        target: { value: '+1-555-1234' }
      });
      await fireEvent.input(screen.getByLabelText(/Job Title/), {
        target: { value: 'Developer' }
      });
      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(mockAuthStore.createAccount).toHaveBeenCalledWith(
          expect.objectContaining({
            company: 'Test Corp',
            phone: '+1-555-1234',
            jobTitle: 'Developer'
          })
        );
      });
    });
  });
});
