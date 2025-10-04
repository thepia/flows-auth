/**
 * Regression Test: RegistrationForm Business Fields Visibility
 *
 * This test ensures that when additionalFields prop is provided,
 * the business fields (company, phone, jobTitle) are shown in the
 * webauthn-register step, not just the basic email field.
 *
 * Bug: RegistrationForm showing basic "Create Account" form with just email
 * instead of the rich registration form with business fields.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RegistrationForm from '../../src/components/RegistrationForm.svelte';
import type { AuthConfig, InvitationTokenData } from '../../src/types';

// Mock WebAuthn API
const mockWebAuthnCredential = {
  id: 'mock-credential-id',
  rawId: new ArrayBuffer(16),
  response: {
    clientDataJSON: new ArrayBuffer(32),
    attestationObject: new ArrayBuffer(64)
  },
  type: 'public-key'
};

Object.defineProperty(navigator, 'credentials', {
  value: {
    create: vi.fn().mockResolvedValue(mockWebAuthnCredential),
    get: vi.fn().mockResolvedValue(mockWebAuthnCredential)
  },
  writable: true
});

// Mock fetch for API calls
global.fetch = vi.fn();

describe('RegistrationForm Business Fields Regression Test', () => {
  let mockFetch: any;
  let authConfig: AuthConfig;
  let invitationTokenData: InvitationTokenData;

  beforeEach(() => {
    mockFetch = global.fetch as any;
    vi.clearAllMocks();

    authConfig = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      domain: 'test.com',
      enablePasskeys: true,
      enableMagicLinks: false,
      branding: {
        companyName: 'Test Company',
        logoUrl: '/logo.svg',
        primaryColor: '#0066cc'
      }
    };

    invitationTokenData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Test Corp',
      phone: '+1234567890',
      jobTitle: 'Software Engineer',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      message: 'Welcome to Test Company!'
    };

    // Mock successful API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/auth/check-email')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              exists: false,
              message: 'Email is available'
            })
        });
      }

      if (url.includes('/auth/register')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              user: {
                id: 'user-123',
                email: 'test@example.com',
                emailVerified: false,
                createdAt: new Date().toISOString()
              },
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token'
            })
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should show business fields in webauthn-register step when additionalFields prop is provided', async () => {
    const { container } = render(RegistrationForm, {
      props: {
        config: authConfig,
        additionalFields: ['company', 'phone', 'jobTitle'],
        invitationTokenData,
        initialEmail: 'test@example.com',
        readOnlyFields: ['email']
      }
    });

    // Step 1: Email entry - should show just email field
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();

    // Business fields should NOT be visible in step 1
    expect(screen.queryByLabelText('Company')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Phone Number')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Job Title')).not.toBeInTheDocument();

    // Click Continue to go to step 2
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
    });

    // Step 2: Terms of Service - business fields should still not be visible
    expect(screen.queryByLabelText('Company')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Phone Number')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Job Title')).not.toBeInTheDocument();

    // Accept terms and continue to step 3
    const termsCheckbox = screen.getByRole('checkbox', { name: /Terms of Service/ });
    const privacyCheckbox = screen.getByRole('checkbox', { name: /Privacy Policy/ });

    fireEvent.click(termsCheckbox);
    fireEvent.click(privacyCheckbox);

    const acceptButton = screen.getByText('Accept & Continue');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByText('Create Account with Passkey')).toBeInTheDocument();
    });

    // Step 3: WebAuthn Register - business fields should NOW be visible
    expect(screen.getByLabelText('First Name (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name (optional)')).toBeInTheDocument();

    // These are the key business fields that should be visible
    expect(screen.getByLabelText('Company')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Job Title')).toBeInTheDocument();

    // Verify fields are prefilled from invitation data
    expect(screen.getByDisplayValue('Test Corp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
  });

  it('should NOT show business fields when additionalFields prop is empty', async () => {
    const { container } = render(RegistrationForm, {
      props: {
        config: authConfig,
        additionalFields: [], // Empty array - no business fields
        invitationTokenData,
        initialEmail: 'test@example.com',
        readOnlyFields: ['email']
      }
    });

    // Progress through all steps
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
    });

    const termsCheckbox = screen.getByRole('checkbox', { name: /Terms of Service/ });
    const privacyCheckbox = screen.getByRole('checkbox', { name: /Privacy Policy/ });

    fireEvent.click(termsCheckbox);
    fireEvent.click(privacyCheckbox);

    const acceptButton = screen.getByText('Accept & Continue');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByText('Create Account with Passkey')).toBeInTheDocument();
    });

    // In step 3, name fields should be visible but business fields should NOT be
    expect(screen.getByLabelText('First Name (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name (optional)')).toBeInTheDocument();

    // Business fields should not be visible
    expect(screen.queryByLabelText('Company')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Phone Number')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Job Title')).not.toBeInTheDocument();
  });

  it('should show only specified business fields when additionalFields prop is partial', async () => {
    const { container } = render(RegistrationForm, {
      props: {
        config: authConfig,
        additionalFields: ['company', 'jobTitle'], // Only company and jobTitle, no phone
        invitationTokenData,
        initialEmail: 'test@example.com',
        readOnlyFields: ['email']
      }
    });

    // Progress to step 3
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
    });

    const termsCheckbox = screen.getByRole('checkbox', { name: /Terms of Service/ });
    const privacyCheckbox = screen.getByRole('checkbox', { name: /Privacy Policy/ });

    fireEvent.click(termsCheckbox);
    fireEvent.click(privacyCheckbox);

    const acceptButton = screen.getByText('Accept & Continue');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByText('Create Account with Passkey')).toBeInTheDocument();
    });

    // Should show company and jobTitle but NOT phone
    expect(screen.getByLabelText('Company')).toBeInTheDocument();
    expect(screen.getByLabelText('Job Title')).toBeInTheDocument();
    expect(screen.queryByLabelText('Phone Number')).not.toBeInTheDocument();
  });

  it('should progress through steps correctly when user does not exist', async () => {
    const { container } = render(RegistrationForm, {
      props: {
        config: authConfig,
        additionalFields: ['company', 'phone', 'jobTitle'],
        invitationTokenData,
        initialEmail: 'test@example.com'
      }
    });

    // Verify we start in step 1
    expect(screen.getByText('Create Account')).toBeInTheDocument();

    // Step 1 → Step 2
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
    });

    // Step 2 → Step 3
    const termsCheckbox = screen.getByRole('checkbox', { name: /Terms of Service/ });
    const privacyCheckbox = screen.getByRole('checkbox', { name: /Privacy Policy/ });

    fireEvent.click(termsCheckbox);
    fireEvent.click(privacyCheckbox);

    const acceptButton = screen.getByText('Accept & Continue');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByText('Create Account with Passkey')).toBeInTheDocument();
    });

    // Verify we're now in step 3 with business fields
    expect(screen.getByLabelText('Company')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Job Title')).toBeInTheDocument();
  });
});
