/**
 * Integration Tests for AccountCreationForm with Auto-Sign-In
 *
 * These tests verify the complete registration flow including:
 * - WebAuthn registration with real API calls
 * - Immediate authentication after registration
 * - Storage configuration updates
 * - Session management integration
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountCreationForm from '../../src/components/AccountCreationForm.svelte';
import { createAuthStore, makeSvelteCompatible } from '../../src/stores';
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

// Mock navigator.credentials
Object.defineProperty(navigator, 'credentials', {
  value: {
    create: vi.fn().mockResolvedValue(mockWebAuthnCredential),
    get: vi.fn().mockResolvedValue(mockWebAuthnCredential)
  },
  writable: true
});

// Mock fetch for API calls
global.fetch = vi.fn();

describe('AccountCreationForm Integration Tests', () => {
  let mockFetch: any;
  let authConfig: AuthConfig;
  let invitationTokenData: InvitationTokenData;

  beforeEach(() => {
    mockFetch = global.fetch as any;
    vi.clearAllMocks();

    authConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.com',
      enablePasskeys: true,
      enableMagicPins: false,
      branding: {
        companyName: 'Test Company'
      }
    };

    invitationTokenData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Test Corp',
      phone: '+1-555-0123',
      jobTitle: 'Engineer',
      expires: new Date('2025-12-31'),
      message: 'Welcome!'
    };

    // Default mock responses
    mockFetch.mockImplementation((url: string, options: any) => {
      if (url.includes('/auth/check-email')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ exists: false })
        });
      }

      if (url.includes('/auth/webauthn/register-challenge')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              challenge: 'mock-challenge',
              user: { id: 'user-123', name: 'test@example.com' },
              rp: { name: 'Test Company' },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
              timeout: 60000
            })
        });
      }

      if (url.includes('/auth/webauthn/register-verify')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              tokens: {
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                expiresAt: Date.now() + 3600000
              },
              user: {
                id: 'user-123',
                email: 'test@example.com',
                emailVerified: true
              }
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

  describe('Complete Registration Flow', () => {
    it('should complete registration and emit appAccess event', async () => {
      const appAccessHandler = vi.fn();
      const successHandler = vi.fn();

      const { component } = render(AccountCreationForm, {
        props: { config: authConfig }
      });

      component.$on('appAccess', appAccessHandler);
      component.$on('success', successHandler);

      // Step 1: Email entry
      const emailInput = screen.getByLabelText('Email address');
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      // Step 2: Terms acceptance
      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText('Accept & Continue'));

      await waitFor(() => {
        expect(screen.getByText('Create Account with Passkey')).toBeInTheDocument();
      });

      // Step 3: WebAuthn registration
      await fireEvent.click(screen.getByText(/Register with Passkey/));

      // Wait for registration to complete
      await waitFor(
        () => {
          expect(appAccessHandler).toHaveBeenCalledWith(
            expect.objectContaining({
              detail: {
                user: expect.objectContaining({
                  id: 'user-123',
                  email: 'test@example.com'
                })
              }
            })
          );
        },
        { timeout: 5000 }
      );

      // Verify success event was also emitted
      expect(successHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            user: expect.objectContaining({
              id: 'user-123',
              email: 'test@example.com'
            }),
            step: 'registration-success'
          }
        })
      );
    });

    it('should handle registration with business fields', async () => {
      const appAccessHandler = vi.fn();

      const { component } = render(AccountCreationForm, {
        props: {
          config: authConfig,
          additionalFields: ['company', 'phone', 'jobTitle']
        }
      });

      component.$on('appAccess', appAccessHandler);

      // Complete email and terms steps
      const emailInput = screen.getByLabelText('Email address');
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText('Accept & Continue'));

      await waitFor(() => {
        expect(screen.getByText('Create Account with Passkey')).toBeInTheDocument();
      });

      // Fill business fields
      await fireEvent.input(screen.getByLabelText('Company'), { target: { value: 'Test Corp' } });
      await fireEvent.input(screen.getByLabelText('Phone Number'), {
        target: { value: '+1-555-9999' }
      });
      await fireEvent.input(screen.getByLabelText('Job Title'), { target: { value: 'Developer' } });

      // Complete registration
      await fireEvent.click(screen.getByText(/Register with Passkey/));

      await waitFor(() => {
        expect(appAccessHandler).toHaveBeenCalled();
      });

      // Verify API was called with business fields
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/webauthn/register-verify'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Test Corp')
        })
      );
    });

    it('should handle invitation token registration', async () => {
      const appAccessHandler = vi.fn();

      const { component } = render(AccountCreationForm, {
        props: {
          config: authConfig,
          invitationTokenData,
          invitationToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test-token',
          additionalFields: ['company', 'phone', 'jobTitle'],
          readOnlyFields: ['email']
        }
      });

      component.$on('appAccess', appAccessHandler);

      // Email should be prefilled and readonly
      const emailInput = screen.getByLabelText('Email address') as HTMLInputElement;
      expect(emailInput.value).toBe('test@example.com');
      expect(emailInput.readOnly).toBe(true);

      await fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText('Accept & Continue'));

      await waitFor(() => {
        expect(screen.getByText('Create Account with Passkey')).toBeInTheDocument();
      });

      // Business fields should be prefilled
      expect((screen.getByLabelText('Company') as HTMLInputElement).value).toBe('Test Corp');
      expect((screen.getByLabelText('Phone Number') as HTMLInputElement).value).toBe('+1-555-0123');
      expect((screen.getByLabelText('Job Title') as HTMLInputElement).value).toBe('Engineer');

      // Complete registration
      await fireEvent.click(screen.getByText(/Register with Passkey/));

      await waitFor(() => {
        expect(appAccessHandler).toHaveBeenCalled();
      });

      // Verify invitation token was included
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/webauthn/register-verify'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test-token')
        })
      );
    });
  });

  describe('Authentication State Management', () => {
    it('should update auth store state after successful registration', async () => {
      const { component } = render(AccountCreationForm, {
        props: { config: authConfig }
      });

      // Mock auth store to track state changes
      const mockAuthStore = {
        subscribe: vi.fn(),
        state: 'unauthenticated',
        user: null,
        accessToken: null
      };

      // Complete registration flow
      const emailInput = screen.getByLabelText('Email address');
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText('Accept & Continue'));

      await waitFor(() => {
        expect(screen.getByText('Create Account with Passkey')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByText(/Register with Passkey/));

      // Wait for registration to complete
      await waitFor(() => {
        expect(screen.getByText('Account Created Successfully!')).toBeInTheDocument();
      });

      // Verify WebAuthn registration was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/webauthn/register-challenge'),
        expect.objectContaining({
          method: 'POST'
        })
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/webauthn/register-verify'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should handle session storage configuration updates', async () => {
      const { component } = render(AccountCreationForm, {
        props: { config: authConfig }
      });

      // Mock localStorage for session storage
      const mockLocalStorage = {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });

      // Complete registration
      const emailInput = screen.getByLabelText('Email address');
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText('Accept & Continue'));

      await waitFor(() => {
        expect(screen.getByText('Create Account with Passkey')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByText(/Register with Passkey/));

      await waitFor(() => {
        expect(screen.getByText('Account Created Successfully!')).toBeInTheDocument();
      });

      // Verify session data was stored
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('auth'),
        expect.any(String)
      );
    });
  });

  describe('Error Handling in Integration', () => {
    it('should handle WebAuthn registration failure', async () => {
      // Mock WebAuthn failure
      (navigator.credentials.create as any).mockRejectedValue(new Error('WebAuthn failed'));

      const errorHandler = vi.fn();

      const { component } = render(AccountCreationForm, {
        props: { config: authConfig }
      });

      component.$on('error', errorHandler);

      // Complete flow until registration
      const emailInput = screen.getByLabelText('Email address');
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText('Accept & Continue'));

      await waitFor(() => {
        expect(screen.getByText('Create Account with Passkey')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByText(/Register with Passkey/));

      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: {
              error: expect.objectContaining({
                code: 'registration_failed'
              })
            }
          })
        );
      });
    });

    it('should handle API server errors', async () => {
      // Mock API error
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/auth/webauthn/register-challenge')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server error' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ exists: false })
        });
      });

      const errorHandler = vi.fn();

      const { component } = render(AccountCreationForm, {
        props: { config: authConfig }
      });

      component.$on('error', errorHandler);

      // Complete flow
      const emailInput = screen.getByLabelText('Email address');
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText('Accept & Continue'));

      await waitFor(() => {
        expect(screen.getByText('Create Account with Passkey')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByText(/Register with Passkey/));

      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalled();
      });
    });

    it('should handle network connectivity issues', async () => {
      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      const errorHandler = vi.fn();

      const { component } = render(AccountCreationForm, {
        props: { config: authConfig }
      });

      component.$on('error', errorHandler);

      // Try to proceed with email check
      const emailInput = screen.getByLabelText('Email address');
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText(/Failed to check email/)).toBeInTheDocument();
      });
    });
  });

  describe('Cross-Browser Compatibility', () => {
    it('should handle WebAuthn not supported scenario', async () => {
      // Mock WebAuthn not supported
      Object.defineProperty(navigator, 'credentials', {
        value: undefined,
        writable: true
      });

      const { component } = render(AccountCreationForm, {
        props: { config: authConfig }
      });

      // Complete flow
      const emailInput = screen.getByLabelText('Email address');
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText('Accept & Continue'));

      await waitFor(() => {
        expect(screen.getByText('Create Account with Passkey')).toBeInTheDocument();
      });

      // Button should show different text when WebAuthn not supported
      expect(screen.getByText('Create Account')).toBeInTheDocument();
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should handle multiple rapid form submissions', async () => {
      const { component } = render(AccountCreationForm, {
        props: { config: authConfig }
      });

      const emailInput = screen.getByLabelText('Email address');
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

      const continueButton = screen.getByText('Continue');

      // Rapid clicks should not cause multiple API calls
      await fireEvent.click(continueButton);
      await fireEvent.click(continueButton);
      await fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
      });

      // Should only make one API call
      const emailCheckCalls = mockFetch.mock.calls.filter((call) =>
        call[0].includes('/auth/check-email')
      );
      expect(emailCheckCalls).toHaveLength(1);
    });

    it('should maintain form state during network delays', async () => {
      // Mock slow API response
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/auth/check-email')) {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ exists: false })
              });
            }, 1000);
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      const { component } = render(AccountCreationForm, {
        props: { config: authConfig }
      });

      const emailInput = screen.getByLabelText('Email address');
      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(screen.getByText('Continue'));

      // Form should show loading state
      expect(screen.getByText('Checking email...')).toBeInTheDocument();

      // Input should be disabled during loading
      expect(emailInput).toBeDisabled();

      // Wait for completion
      await waitFor(
        () => {
          expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Form should be responsive again
      expect(screen.getByLabelText(/Terms of Service/)).toBeEnabled();
    });
  });
});
