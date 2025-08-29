/**
 * Regression Tests for Auto-Sign-In Bug
 * 
 * This test suite specifically addresses the reported bug where:
 * "After completing registration, I am not automatically signed in"
 * 
 * The bug manifested in the original SignInForm when in registration mode,
 * where users would complete WebAuthn registration but see a success screen
 * instead of being immediately signed in and granted app access.
 * 
 * These tests ensure that the auto-sign-in behavior works correctly and
 * prevents regression of this critical user experience issue.
 * 
 * Related Issue: Users should transition to `authenticated-unconfirmed` state
 * immediately after registration, allowing immediate app access while email
 * verification happens in the background.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import RegistrationForm from '../../src/components/RegistrationForm.svelte';
import type { AuthConfig } from '../../src/types';

// Mock WebAuthn API
const mockWebAuthnCredential = {
  id: 'regression-test-credential-id',
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

// Mock WebAuthn utilities
vi.mock('../../src/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn(() => true),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true))
}));

// Mock the auth store
const mockAuthStore = {
  registerUser: vi.fn(),
  api: {
    checkEmail: vi.fn()
  }
};

// Mock the createAuthStore function
vi.mock('../../src/stores/auth-store', () => ({
  createAuthStore: vi.fn(() => mockAuthStore)
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Auto-Sign-In Bug Regression Tests', () => {
  let mockFetch: any;
  let authConfig: AuthConfig;

  beforeEach(() => {
    mockFetch = global.fetch as any;
    vi.clearAllMocks();

    authConfig = {
      apiBaseUrl: 'https://api.test.com',
      domain: 'test.com',
      enablePasskeys: true,
      enableMagicLinks: false,
      enableSocialLogin: false,
      enablePasswordLogin: false,
      branding: {
        companyName: 'Test Company'
      }
    };

    // Default mock implementations
    mockAuthStore.api.checkEmail.mockResolvedValue({ exists: false });
    mockAuthStore.registerUser.mockResolvedValue({
      step: 'success',
      user: { id: 'user-123', email: 'test@example.com', emailVerified: false }
    });

    // Mock successful registration flow
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
          json: () => Promise.resolve({
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
          json: () => Promise.resolve({
            success: true,
            tokens: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
              expiresAt: Date.now() + 3600000
            },
            user: {
              id: 'user-123',
              email: 'test@example.com',
              emailVerified: false, // This is key - user needs to verify email
              name: 'Test User'
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

  describe('Critical Auto-Sign-In Behavior', () => {
    it('should emit appAccess event immediately after successful registration', async () => {
      const appAccessHandler = vi.fn();
      const successHandler = vi.fn();
      
      const { component } = render(RegistrationForm, {
        props: { config: authConfig }
      });

      // Set up event listeners
      component.$on('appAccess', appAccessHandler);
      component.$on('success', successHandler);

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

      await fireEvent.click(screen.getByText('Create Account'));

      // CRITICAL: appAccess event must be emitted immediately
      await waitFor(() => {
        expect(appAccessHandler).toHaveBeenCalled();
      }, { timeout: 5000 });
      
      // Check the event detail
      const appAccessCall = appAccessHandler.mock.calls[0][0];
      expect(appAccessCall.detail).toEqual(
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'user-123',
            email: 'test@example.com',
            emailVerified: false
          })
        })
      );

      // Success event should also be emitted
      expect(successHandler).toHaveBeenCalled();
      const successCall = successHandler.mock.calls[0][0];
      expect(successCall.detail).toEqual(
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'user-123',
            email: 'test@example.com'
          }),
          step: 'registration-success'
        })
      );
    });

    it('should NOT show persistent success screen that blocks app access', async () => {
      const appAccessHandler = vi.fn();
      
      const { component } = render(RegistrationForm, {
        props: { config: authConfig }
      });

      component.$on('appAccess', appAccessHandler);

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

      await fireEvent.click(screen.getByText('Create Account'));

      // Wait for registration to complete
      await waitFor(() => {
        expect(appAccessHandler).toHaveBeenCalled();
      });

      // The success screen should appear but should NOT block app access
      // The consuming application should handle app access event and potentially hide the form
      expect(screen.getByText('Account Created Successfully!')).toBeInTheDocument();
      expect(screen.getByText(/You can now explore the application/)).toBeInTheDocument();
    });

    it('should handle registration success with unverified email correctly', async () => {
      const appAccessHandler = vi.fn();
      
      const { component } = render(RegistrationForm, {
        props: { config: authConfig }
      });

      component.$on('appAccess', appAccessHandler);

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

      await fireEvent.click(screen.getByText('Create Account'));

      // Wait for registration to complete
      await waitFor(() => {
        expect(appAccessHandler).toHaveBeenCalled();
        
        // Check the event detail
        const appAccessCall = appAccessHandler.mock.calls[0][0];
        expect(appAccessCall.detail).toEqual(
          expect.objectContaining({
            user: expect.objectContaining({
              email: 'test@example.com', // The mock always returns this email
              emailVerified: false // Key: user should have unverified email
            })
          })
        );
      });

      // Success info should mention email verification
      expect(screen.getByText(/We've sent a welcome email to/)).toBeInTheDocument();
      expect(screen.getByText(/Verify your email to unlock all features/)).toBeInTheDocument();
    });
  });

  describe('State Machine Compliance', () => {
    it('should transition to authenticated-unconfirmed state after registration', async () => {
      const appAccessHandler = vi.fn();
      
      const { component } = render(RegistrationForm, {
        props: { config: authConfig }
      });

      component.$on('appAccess', appAccessHandler);

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

      await fireEvent.click(screen.getByText('Create Account'));

      // Wait for registration to complete
      await waitFor(() => {
        expect(appAccessHandler).toHaveBeenCalled();
      });

      // Verify the user data aligns with authenticated-unconfirmed state
      const appAccessCall = appAccessHandler.mock.calls[0][0];
      const userData = appAccessCall.detail.user;
      
      expect(userData).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String),
          emailVerified: false // This indicates authenticated-unconfirmed state
        })
      );
    });

    it('should allow immediate app exploration after registration', async () => {
      const appAccessHandler = vi.fn();
      
      const { component } = render(RegistrationForm, {
        props: { config: authConfig }
      });

      component.$on('appAccess', appAccessHandler);

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

      await fireEvent.click(screen.getByText('Create Account'));

      // Wait for registration to complete
      await waitFor(() => {
        expect(appAccessHandler).toHaveBeenCalled();
      });

      // The success message should indicate immediate app access
      expect(screen.getByText('Account Created Successfully!')).toBeInTheDocument();
      expect(screen.getByText(/You can now explore the application/)).toBeInTheDocument();
    });
  });

  describe('Error Scenarios That Should NOT Block Auto-Sign-In', () => {
    it('should still emit appAccess even if welcome email fails', async () => {
      // Mock scenario where user creation succeeds but email sending fails
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
            json: () => Promise.resolve({
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
            json: () => Promise.resolve({
              success: true,
              tokens: {
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                expiresAt: Date.now() + 3600000
              },
              user: {
                id: 'user-123',
                email: 'test@example.com',
                emailVerified: false
              },
              welcomeEmailSent: false // Email sending failed
            })
          });
        }
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      const appAccessHandler = vi.fn();
      
      const { component } = render(RegistrationForm, {
        props: { config: authConfig }
      });

      component.$on('appAccess', appAccessHandler);

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

      await fireEvent.click(screen.getByText('Create Account'));

      // Even if email fails, user should still get app access
      await waitFor(() => {
        expect(appAccessHandler).toHaveBeenCalled();
      });

      // User should still be able to access app
      expect(screen.getByText('Account Created Successfully!')).toBeInTheDocument();
    });
  });

  describe('Event Timing and Order', () => {
    it('should emit appAccess before or simultaneously with success event', async () => {
      const events: Array<{ type: string; timestamp: number }> = [];
      
      const appAccessHandler = vi.fn(() => {
        events.push({ type: 'appAccess', timestamp: Date.now() });
      });
      
      const successHandler = vi.fn(() => {
        events.push({ type: 'success', timestamp: Date.now() });
      });
      
      const { component } = render(RegistrationForm, {
        props: { config: authConfig }
      });

      component.$on('appAccess', appAccessHandler);
      component.$on('success', successHandler);

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

      await fireEvent.click(screen.getByText('Create Account'));

      // Wait for both events to fire
      await waitFor(() => {
        expect(appAccessHandler).toHaveBeenCalled();
        expect(successHandler).toHaveBeenCalled();
      });

      // Verify event order - appAccess should come before or at the same time as success
      expect(events).toHaveLength(2);
      const appAccessEvent = events.find(e => e.type === 'appAccess');
      const successEvent = events.find(e => e.type === 'success');
      
      expect(appAccessEvent).toBeDefined();
      expect(successEvent).toBeDefined();
      expect(appAccessEvent!.timestamp).toBeLessThanOrEqual(successEvent!.timestamp);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility with existing success event handlers', async () => {
      const successHandler = vi.fn();
      
      const { component } = render(RegistrationForm, {
        props: { config: authConfig }
      });

      // Only listen to success event (old pattern)
      component.$on('success', successHandler);

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

      await fireEvent.click(screen.getByText('Create Account'));

      // Success event should still work as before
      await waitFor(() => {
        expect(successHandler).toHaveBeenCalled();
      });
      
      // Check the event detail
      const successCall = successHandler.mock.calls[0][0];
      expect(successCall.detail).toEqual(
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'user-123',
            email: 'test@example.com'
          }),
          step: 'registration-success'
        })
      );
    });
  });
});