/**
 * Integration Tests for AccountCreationForm
 *
 * AccountCreationForm is a single-page registration form (no multi-step
 * wizard): email/name/company/phone/job-title fields, terms checkboxes, and
 * one submit button all render at once. Submitting calls
 * `authStore.api.checkEmail()` then `authStore.createAccount()` - there is
 * no client-side WebAuthn ceremony (no navigator.credentials.create() call);
 * passkey provisioning happens server-side as part of the same request.
 *
 * These tests verify:
 * - The complete registration flow against the real (non-mocked) auth store,
 *   using the modern app-scoped API paths (/{appCode}/check-user,
 *   /{appCode}/create-user)
 * - Immediate authentication + appAccess when the server returns tokens
 *   (e.g. invitation-verified email)
 * - Deferred authentication (no appAccess yet) when the server does not
 *   return tokens (email still needs verification)
 * - Error handling for API/network failures
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountCreationForm from '../../src/components/AccountCreationForm.svelte';
import { createAuthStore, makeSvelteCompatible } from '../../src/stores';
import type { AuthConfig, InvitationTokenData } from '../../src/types';
import { globalUserCache } from '../../src/utils/user-cache';

const APP_CODE = 'demo';

global.fetch = vi.fn();

function createTestStore() {
  const authConfig: AuthConfig = {
    apiBaseUrl: 'https://api.test.com',
    clientId: 'test-client', // deprecated field, still required by AuthConfig
    domain: 'test.com',
    appCode: APP_CODE,
    enablePasskeys: true,
    enableMagicLinks: false,
    branding: {
      companyName: 'Test Company'
    }
  };
  return makeSvelteCompatible(createAuthStore(authConfig));
}

describe('AccountCreationForm Integration Tests', () => {
  let mockFetch: any;
  let invitationTokenData: InvitationTokenData;

  beforeEach(() => {
    mockFetch = global.fetch as any;
    vi.clearAllMocks();
    globalUserCache.clearAll();

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

    // Default mock responses for the modern app-scoped endpoints
    mockFetch.mockImplementation((url: string, options: any) => {
      if (url.includes(`/${APP_CODE}/check-user`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ exists: false, hasWebAuthn: false })
        });
      }

      if (url.includes(`/${APP_CODE}/create-user`)) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              user: {
                id: 'user-123',
                email: 'test@example.com',
                emailVerified: false
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

  async function fillAndSubmit(overrides: Record<string, string> = {}) {
    const email = overrides.email ?? 'test@example.com';
    const firstName = overrides.firstName ?? 'Jane';
    const lastName = overrides.lastName ?? 'Smith';

    const emailInput = screen.getByLabelText('Email Address *') as HTMLInputElement;
    if (!emailInput.readOnly) {
      await fireEvent.input(emailInput, { target: { value: email } });
    }
    await fireEvent.input(screen.getByLabelText('First Name *'), { target: { value: firstName } });
    await fireEvent.input(screen.getByLabelText('Last Name *'), { target: { value: lastName } });

    if (overrides.company !== undefined) {
      await fireEvent.input(screen.getByLabelText('Company'), {
        target: { value: overrides.company }
      });
    }
    if (overrides.phone !== undefined) {
      await fireEvent.input(screen.getByLabelText('Phone Number'), {
        target: { value: overrides.phone }
      });
    }
    if (overrides.jobTitle !== undefined) {
      await fireEvent.input(screen.getByLabelText('Job Title'), {
        target: { value: overrides.jobTitle }
      });
    }

    await fireEvent.click(screen.getByLabelText(/Terms of Service/));
    await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
    await fireEvent.click(screen.getByText(/Create Account with Passkey/));
  }

  describe('Complete Registration Flow', () => {
    it('should emit success once registration completes', async () => {
      const successHandler = vi.fn();
      const authStore = createTestStore();

      render(AccountCreationForm, {
        props: { store: authStore },
        events: { success: successHandler }
      });

      await fillAndSubmit();

      await waitFor(() => {
        expect(successHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: {
              user: expect.objectContaining({
                id: 'user-123',
                email: 'test@example.com'
              })
            }
          })
        );
      });
    });

    it('should emit appAccess immediately when the server returns tokens', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes(`/${APP_CODE}/check-user`)) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: false, hasWebAuthn: false })
          });
        }
        if (url.includes(`/${APP_CODE}/create-user`)) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                user: { id: 'user-123', email: 'test@example.com', emailVerified: true },
                access_token: 'mock-access-token',
                refresh_token: 'mock-refresh-token',
                expires_in: 3600
              })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const appAccessHandler = vi.fn();
      const authStore = createTestStore();

      render(AccountCreationForm, {
        props: { store: authStore },
        events: { appAccess: appAccessHandler }
      });

      await fillAndSubmit();

      await waitFor(() => {
        expect(appAccessHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: expect.objectContaining({
              user: expect.objectContaining({ id: 'user-123', email: 'test@example.com' })
            })
          })
        );
      });
    });

    it('should not emit appAccess when the server defers verification (no tokens)', async () => {
      // Default mock returns no access_token - createAccount() should not
      // authenticate the store yet, so appAccess must not fire.
      const appAccessHandler = vi.fn();
      const successHandler = vi.fn();
      const authStore = createTestStore();

      render(AccountCreationForm, {
        props: { store: authStore },
        events: { appAccess: appAccessHandler, success: successHandler }
      });

      await fillAndSubmit();

      await waitFor(() => expect(successHandler).toHaveBeenCalled());
      expect(appAccessHandler).not.toHaveBeenCalled();
    });

    it('should send business fields to the create-user endpoint', async () => {
      const authStore = createTestStore();

      render(AccountCreationForm, { props: { store: authStore } });

      await fillAndSubmit({ company: 'Test Corp', phone: '+1-555-9999', jobTitle: 'Developer' });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/${APP_CODE}/create-user`),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Test Corp')
          })
        );
      });
    });

    it('should prefill and lock the email field from invitation token data', async () => {
      const authStore = createTestStore();

      render(AccountCreationForm, {
        props: {
          store: authStore,
          invitationTokenData,
          invitationToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test-token',
          readOnlyFields: ['email']
        }
      });

      const emailInput = screen.getByLabelText('Email Address *') as HTMLInputElement;
      expect(emailInput.value).toBe('test@example.com');
      expect(emailInput.readOnly).toBe(true);

      // Business fields prefilled from the invitation
      expect((screen.getByLabelText('Company') as HTMLInputElement).value).toBe('Test Corp');
      expect((screen.getByLabelText('Phone Number') as HTMLInputElement).value).toBe(
        '+1-555-0123'
      );
      expect((screen.getByLabelText('Job Title') as HTMLInputElement).value).toBe('Engineer');

      await fillAndSubmit();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/${APP_CODE}/create-user`),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test-token')
          })
        );
      });
    });
  });

  describe('Error Handling in Integration', () => {
    it('should handle create-user API server errors', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes(`/${APP_CODE}/check-user`)) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: false, hasWebAuthn: false })
          });
        }
        if (url.includes(`/${APP_CODE}/create-user`)) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server error' })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const errorHandler = vi.fn();
      const authStore = createTestStore();

      render(AccountCreationForm, {
        props: { store: authStore },
        events: { error: errorHandler }
      });

      await fillAndSubmit();

      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: {
              error: expect.objectContaining({ code: 'registration_failed' })
            }
          })
        );
      });
    });

    it('should handle network connectivity issues during email check', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const authStore = createTestStore();

      render(AccountCreationForm, { props: { store: authStore } });

      await fireEvent.input(screen.getByLabelText('Email Address *'), {
        target: { value: 'test@example.com' }
      });
      await fireEvent.input(screen.getByLabelText('First Name *'), {
        target: { value: 'Jane' }
      });
      await fireEvent.input(screen.getByLabelText('Last Name *'), {
        target: { value: 'Smith' }
      });
      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(screen.getByText(/Network error|Registration failed/)).toBeInTheDocument();
      });
    });

    it('should show an error and not submit when an account already exists', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes(`/${APP_CODE}/check-user`)) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: true, hasWebAuthn: true })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const authStore = createTestStore();
      render(AccountCreationForm, { props: { store: authStore } });

      await fillAndSubmit();

      await waitFor(() => {
        expect(screen.getByText(/already exists/i)).toBeInTheDocument();
      });
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining(`/${APP_CODE}/create-user`),
        expect.anything()
      );
    });
  });

  describe('Form Validation', () => {
    it('should not submit without accepting terms and privacy', async () => {
      const authStore = createTestStore();
      render(AccountCreationForm, { props: { store: authStore } });

      await fireEvent.input(screen.getByLabelText('Email Address *'), {
        target: { value: 'test@example.com' }
      });
      await fireEvent.input(screen.getByLabelText('First Name *'), {
        target: { value: 'Jane' }
      });
      await fireEvent.input(screen.getByLabelText('Last Name *'), {
        target: { value: 'Smith' }
      });

      const submitButton = screen.getByText(/Create Account with Passkey/).closest('button')!;
      expect(submitButton).toBeDisabled();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should disable the submit button while a registration is in flight', async () => {
      let resolveCheck: (value: any) => void;
      mockFetch.mockImplementation((url: string) => {
        if (url.includes(`/${APP_CODE}/check-user`)) {
          return new Promise((resolve) => {
            resolveCheck = resolve;
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const authStore = createTestStore();
      render(AccountCreationForm, { props: { store: authStore } });

      await fireEvent.input(screen.getByLabelText('Email Address *'), {
        target: { value: 'test@example.com' }
      });
      await fireEvent.input(screen.getByLabelText('First Name *'), {
        target: { value: 'Jane' }
      });
      await fireEvent.input(screen.getByLabelText('Last Name *'), {
        target: { value: 'Smith' }
      });
      await fireEvent.click(screen.getByLabelText(/Terms of Service/));
      await fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      await fireEvent.click(screen.getByText(/Create Account with Passkey/));

      await waitFor(() => {
        expect(screen.getByText('Creating Account...')).toBeInTheDocument();
      });
      expect(screen.getByText('Creating Account...').closest('button')).toBeDisabled();

      resolveCheck!({ ok: true, json: () => Promise.resolve({ exists: false, hasWebAuthn: false }) });
    });
  });
});
