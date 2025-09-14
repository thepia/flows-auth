/**
 * Safe Integration Regression Tests
 *
 * These tests verify the fixes work in integration without making real API calls
 * or requiring external dependencies. They focus on the component behavior and
 * error handling patterns we fixed.
 */

import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInForm from '../../src/components/SignInForm.svelte';
import { createAuthStore } from '../../src/stores/auth-store';

// Mock fetch to avoid real API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Integration Regression Tests (Safe)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
  });

  describe('End-to-End Error Handling Flow', () => {
    it('should handle complete unregistered user flow without technical errors', async () => {
      // Mock API responses for unregistered user
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            exists: false,
            hasWebAuthn: false
          })
      });

      const authStore = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        clientId: 'test-client',
        domain: 'test.com'
      });

      const { getByText, getByPlaceholderText, queryByText } = render(SignInForm, {
        props: {
          config: {
            apiBaseUrl: 'https://api.thepia.com',
            clientId: 'test-client',
            domain: 'test.com'
          }
        },
        context: new Map([['authStore', authStore]])
      });

      // Enter email and attempt sign in
      const emailInput = getByPlaceholderText(/email/i);
      const signInButton = getByText('🔑 Sign in with Passkey');

      await fireEvent.input(emailInput, { target: { value: 'newuser@example.com' } });
      await fireEvent.click(signInButton);

      await waitFor(
        () => {
          // ✅ REGRESSION TEST: Should NOT show technical errors
          expect(queryByText(/endpoint.*not found/i)).toBeNull();
          expect(queryByText(/auth\/signin\/magic-link/)).toBeNull();
          expect(queryByText(/404/)).toBeNull();

          // ✅ Should transition to registration OR show user-friendly message
          const hasGoodUX =
            queryByText(/terms of service/i) ||
            queryByText(/try again/i) ||
            queryByText(/register/i);
          expect(hasGoodUX).toBeTruthy();
        },
        { timeout: 3000 }
      );

      // ✅ Verify API was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.thepia.com/auth/check-user',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'newuser@example.com' })
        })
      );
    });

    it('should handle API errors gracefully without exposing internals', async () => {
      // Mock API error response
      mockFetch.mockRejectedValueOnce(new Error('Endpoint not found'));

      const authStore = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        clientId: 'test-client',
        domain: 'test.com'
      });

      const { getByText, getByPlaceholderText, queryByText } = render(SignInForm, {
        props: {
          config: {
            apiBaseUrl: 'https://api.thepia.com',
            clientId: 'test-client',
            domain: 'test.com'
          }
        },
        context: new Map([['authStore', authStore]])
      });

      const emailInput = getByPlaceholderText(/email/i);
      const signInButton = getByText('🔑 Sign in with Passkey');

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(signInButton);

      await waitFor(
        () => {
          // ✅ REGRESSION TEST: Technical error should be hidden
          expect(queryByText('Endpoint not found')).toBeNull();
          expect(queryByText('404')).toBeNull();

          // ✅ Should show user-friendly message OR auto-transition
          const hasUserFriendlyResponse =
            queryByText(/terms of service/i) ||
            queryByText(/try again/i) ||
            queryByText(/authentication.*failed/i);
          expect(hasUserFriendlyResponse).toBeTruthy();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Component Architecture Compliance', () => {
    it('should use auth store methods not direct API calls', async () => {
      const authStore = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        clientId: 'test-client',
        domain: 'test.com'
      });

      // Spy on auth store methods
      const checkUserSpy = vi.spyOn(authStore, 'checkUser');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            exists: true,
            hasWebAuthn: true
          })
      });

      const { getByText, getByPlaceholderText } = render(SignInForm, {
        props: {
          config: {
            apiBaseUrl: 'https://api.thepia.com',
            clientId: 'test-client',
            domain: 'test.com'
          }
        },
        context: new Map([['authStore', authStore]])
      });

      const emailInput = getByPlaceholderText(/email/i);
      const signInButton = getByText('🔑 Sign in with Passkey');

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.click(signInButton);

      await waitFor(() => {
        // ✅ REGRESSION TEST: Should use auth store method
        expect(checkUserSpy).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should inherit API configuration from auth store', () => {
      const authStore = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        clientId: 'test-client',
        domain: 'test.com'
      });

      // ✅ REGRESSION TEST: Component should render without its own API config
      expect(() => {
        render(SignInForm, {
          props: {
            config: {
              // Note: No apiBaseUrl - should inherit from auth store
              clientId: 'test-client',
              domain: 'test.com'
            }
          },
          context: new Map([['authStore', authStore]])
        });
      }).not.toThrow();
    });
  });

  describe('Build and Import Safety', () => {
    it('should import and render without compilation errors', () => {
      // ✅ REGRESSION TEST: Component should import cleanly
      expect(() => {
        const authStore = createAuthStore({
          apiBaseUrl: 'https://api.thepia.com',
          clientId: 'test-client',
          domain: 'test.com'
        });

        render(SignInForm, {
          props: {
            config: {
              apiBaseUrl: 'https://api.thepia.com',
              clientId: 'test-client',
              domain: 'test.com'
            }
          },
          context: new Map([['authStore', authStore]])
        });
      }).not.toThrow();
    });

    it('should have all expected exports available', async () => {
      // ✅ REGRESSION TEST: Main exports should be available
      const exports = await import('../../src/index');

      expect(exports.SignInForm).toBeDefined();
      expect(exports.createAuthStore).toBeDefined();
      expect(exports.RegistrationForm).toBeDefined();
      expect(typeof exports.createAuthStore).toBe('function');
    });
  });

  describe('Error Message Quality Assurance', () => {
    it('should never show raw error objects to users', async () => {
      // Mock various error types
      const errorTypes = [
        new Error('Endpoint not found'),
        new Error('404: Not Found'),
        { status: 404, message: 'API endpoint not available' },
        new Error('Network request failed'),
        new Error('TypeError: Cannot read properties of undefined')
      ];

      for (const error of errorTypes) {
        mockFetch.mockRejectedValueOnce(error);

        const authStore = createAuthStore({
          apiBaseUrl: 'https://api.thepia.com',
          clientId: 'test-client',
          domain: 'test.com'
        });

        const { getByText, getByPlaceholderText, queryByText } = render(SignInForm, {
          props: {
            config: {
              apiBaseUrl: 'https://api.thepia.com',
              clientId: 'test-client',
              domain: 'test.com'
            }
          },
          context: new Map([['authStore', authStore]])
        });

        const emailInput = getByPlaceholderText(/email/i);
        const signInButton = getByText('🔑 Sign in with Passkey');

        await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
        await fireEvent.click(signInButton);

        await waitFor(() => {
          // ✅ REGRESSION TEST: Should never show raw error details
          expect(queryByText(/endpoint.*not found/i)).toBeNull();
          expect(queryByText(/404/)).toBeNull();
          expect(queryByText(/TypeError/)).toBeNull();
          expect(queryByText(/Cannot read properties/)).toBeNull();
          expect(queryByText(/undefined/)).toBeNull();
        });

        cleanup();
      }
    });
  });
});
