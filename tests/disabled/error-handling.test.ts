/**
 * Regression Tests for Error Handling Fixes
 * 
 * These tests guard against the specific bugs we fixed:
 * 1. Technical error exposure to users
 * 2. Incorrect API configuration architecture
 * 3. Component compilation issues
 * 4. Missing automatic registration flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { createAuthStore } from '../../src/stores/auth-store';
import SignInForm from '../../src/components/SignInForm.svelte';

describe('Error Handling Regression Tests', () => {
  let mockAuthStore: any;
  let mockCheckUser: any;

  beforeEach(() => {
    // Mock auth store with controlled responses
    mockCheckUser = vi.fn();
    mockAuthStore = {
      checkUser: mockCheckUser,
      signInWithPasskey: vi.fn(),
      signInWithMagicLink: vi.fn(),
      subscribe: vi.fn(() => () => {}),
      api: {
        checkEmail: vi.fn() // Should NOT be called directly by components
      }
    };
  });

  describe('Bug Fix: Technical Error Exposure', () => {
    it('should NOT expose technical API endpoint errors to users', async () => {
      // Simulate the original bug: API returns technical error
      const technicalError = new Error('Endpoint not found');
      mockCheckUser.mockRejectedValue(technicalError);

      const { getByText, queryByText } = render(SignInForm, {
        props: {
          config: {
            apiBaseUrl: 'https://api.thepia.com',
            clientId: 'test',
            domain: 'test.com'
          }
        },
        context: new Map([['authStore', mockAuthStore]])
      });

      const emailInput = getByText('Email address').closest('input') as HTMLInputElement;
      const signInButton = getByText('🔑 Sign in with Passkey');

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(signInButton);

      await waitFor(() => {
        // ✅ REGRESSION TEST: Technical error should NOT be visible
        expect(queryByText('Endpoint not found')).toBeNull();
        expect(queryByText('404')).toBeNull();
        expect(queryByText('not found')).toBeNull();
        
        // ✅ Should show user-friendly message OR auto-transition to registration
        const hasUserFriendlyError = queryByText(/authentication.*failed/i) || 
                                   queryByText(/try again/i) ||
                                   queryByText(/Terms of Service/i); // Registration step
        expect(hasUserFriendlyError).toBeTruthy();
      });
    });

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
        mockCheckUser.mockRejectedValue(testCase.error);

        const { getByText, queryByText } = render(SignInForm, {
          props: {
            config: {
              apiBaseUrl: 'https://api.thepia.com',
              clientId: 'test',
              domain: 'test.com'
            }
          },
          context: new Map([['authStore', mockAuthStore]])
        });

        const emailInput = getByText('Email address').closest('input') as HTMLInputElement;
        const signInButton = getByText('🔑 Sign in with Passkey');

        await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
        await fireEvent.click(signInButton);

        await waitFor(() => {
          // ✅ Should show user-friendly message
          const errorElements = document.querySelectorAll('[class*="error"], [role="alert"]');
          const hasUserFriendlyMessage = Array.from(errorElements).some(el => 
            testCase.expectedPattern.test(el.textContent || '')
          );
          expect(hasUserFriendlyMessage).toBeTruthy();
        });
      }
    });
  });

  describe('Bug Fix: Automatic Registration Flow', () => {
    it('should automatically transition to registration for unregistered users', async () => {
      // Simulate unregistered user
      mockCheckUser.mockResolvedValue({
        exists: false,
        hasWebAuthn: false,
        userId: undefined
      });

      const { getByText, queryByText } = render(SignInForm, {
        props: {
          config: {
            apiBaseUrl: 'https://api.thepia.com',
            clientId: 'test',
            domain: 'test.com'
          }
        },
        context: new Map([['authStore', mockAuthStore]])
      });

      const emailInput = getByText('Email address').closest('input') as HTMLInputElement;
      const signInButton = getByText('🔑 Sign in with Passkey');

      await fireEvent.input(emailInput, { target: { value: 'newuser@example.com' } });
      await fireEvent.click(signInButton);

      await waitFor(() => {
        // ✅ REGRESSION TEST: Should auto-transition to registration
        expect(queryByText('Terms of Service')).toBeTruthy();
        expect(queryByText('Privacy Policy')).toBeTruthy();
        
        // ✅ Should NOT show error message for unregistered user
        expect(queryByText(/authentication.*failed/i)).toBeNull();
        expect(queryByText(/no.*passkey.*found/i)).toBeNull();
      });
    });

    it('should NOT show unhelpful error messages for missing passkeys', async () => {
      // Simulate user exists but no passkey
      mockCheckUser.mockResolvedValue({
        exists: true,
        hasWebAuthn: false,
        userId: 'user123'
      });

      const { getByText, queryByText } = render(SignInForm, {
        props: {
          config: {
            apiBaseUrl: 'https://api.thepia.com',
            clientId: 'test',
            domain: 'test.com',
            enableMagicPins: true
          }
        },
        context: new Map([['authStore', mockAuthStore]])
      });

      const emailInput = getByText('Email address').closest('input') as HTMLInputElement;
      const signInButton = getByText('🔑 Sign in with Passkey');

      await fireEvent.input(emailInput, { target: { value: 'existing@example.com' } });
      await fireEvent.click(signInButton);

      await waitFor(() => {
        // ✅ REGRESSION TEST: Should NOT show "what's wrong" without solution
        expect(queryByText(/no passkey found.*register/i)).toBeNull();
        
        // ✅ Should either auto-transition or provide clear action
        const hasActionableFlow = queryByText(/magic link/i) || 
                                queryByText(/Terms of Service/i) ||
                                queryByText(/check.*email/i);
        expect(hasActionableFlow).toBeTruthy();
      });
    });
  });

  describe('Bug Fix: Correct API Architecture', () => {
    it('should use authStore.checkUser() not direct API calls', async () => {
      mockCheckUser.mockResolvedValue({
        exists: true,
        hasWebAuthn: true,
        userId: 'user123'
      });

      const { getByText } = render(SignInForm, {
        props: {
          config: {
            apiBaseUrl: 'https://api.thepia.com',
            clientId: 'test',
            domain: 'test.com'
          }
        },
        context: new Map([['authStore', mockAuthStore]])
      });

      const emailInput = getByText('Email address').closest('input') as HTMLInputElement;
      const signInButton = getByText('🔑 Sign in with Passkey');

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(signInButton);

      await waitFor(() => {
        // ✅ REGRESSION TEST: Should use authStore.checkUser()
        expect(mockCheckUser).toHaveBeenCalledWith('test@example.com');
        
        // ✅ Should NOT call API directly
        expect(mockAuthStore.api.checkEmail).not.toHaveBeenCalled();
      });
    });

    it('should inherit API configuration from auth store', () => {
      // ✅ REGRESSION TEST: Component should not have its own apiBaseUrl
      const { container } = render(SignInForm, {
        props: {
          config: {
            // Note: No apiBaseUrl here - should inherit from auth store
            clientId: 'test',
            domain: 'test.com'
          }
        },
        context: new Map([['authStore', mockAuthStore]])
      });

      // Component should render without requiring its own API config
      expect(container.querySelector('form')).toBeTruthy();
    });
  });

  describe('Bug Fix: Component Compilation', () => {
    it('should render without "Cannot read properties of undefined" errors', () => {
      // ✅ REGRESSION TEST: Component should compile and render properly
      expect(() => {
        render(SignInForm, {
          props: {
            config: {
              apiBaseUrl: 'https://api.thepia.com',
              clientId: 'test',
              domain: 'test.com'
            }
          },
          context: new Map([['authStore', mockAuthStore]])
        });
      }).not.toThrow();
    });

    it('should have all required UI elements', () => {
      const { getByText, getByPlaceholderText } = render(SignInForm, {
        props: {
          config: {
            apiBaseUrl: 'https://api.thepia.com',
            clientId: 'test',
            domain: 'test.com'
          }
        },
        context: new Map([['authStore', mockAuthStore]])
      });

      // ✅ REGRESSION TEST: Core UI elements should be present
      expect(getByText('🔑 Sign in with Passkey')).toBeTruthy();
      expect(getByPlaceholderText(/email/i)).toBeTruthy();
      expect(getByText(/Assignment Management System/i)).toBeTruthy();
    });
  });
});
