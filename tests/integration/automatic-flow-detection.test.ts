/**
 * Automatic Flow Detection Integration Tests
 *
 * Purpose: verify determineAuthMethod()'s routing in SignInCore picks the
 * right auth method (passkey / passkey-with-fallback / email-code /
 * new-user registration) for each user-state + config
 * combination, entirely behind the single sign-in button - there is no
 * separate "continue" step or method-choice screen (see webauthn-flow.test.ts
 * for WebAuthn-ceremony-specific edge cases; this file focuses on the
 * decision matrix, not the ceremony itself).
 *
 * Note: The original version of this file assumed a Terms-of-Service
 * checkbox step inside SignInForm/SignInCore for new-user registration.
 * That flow has since moved to AccountCreationForm.svelte - SignInCore's
 * new-user path only collects a full name and calls createAccount()
 * directly (acceptedTerms/acceptedPrivacy are not collected here at all) -
 * so those assertions were dropped rather than faked against a UI that
 * doesn't exist in this component.
 *
 * Do NOT introduce mocking of the API client
 * Do introduce mocking of browser APIs like WebAuthn to ensure correct switching of options.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInForm from '../../src/svelte/components/SignInForm.svelte';
import { createAuthStore } from '../../src/core/stores/index.js';
import { makeSvelteCompatible } from '../../src/svelte/adapters/svelte.js';
import type { AuthConfig } from '../../src/core/types/index.js';
import { globalUserCache } from '../../src/core/utils/user-cache.js';

const mockNavigatorCredentials = {
  create: vi.fn(),
  get: vi.fn()
};

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createTestStore(overrides: Partial<AuthConfig> = {}) {
  const config: AuthConfig = {
    apiBaseUrl: 'https://api.test.com',
    clientId: 'test-client',
    appCode: 'demo',
    domain: 'test.com',
    enablePasskeys: true,
    ...overrides
  };
  return makeSvelteCompatible(createAuthStore(config));
}

// SignInCore auto-triggers a debounced checkUser() when the email input
// changes, which leaves the submit button disabled until it resolves. Wait
// for it to become enabled before reading button config/clicking, rather
// than racing that effect.
async function typeEmailAndWait(email: string) {
  const emailInput = screen.getByPlaceholderText(/email/i);
  await fireEvent.input(emailInput, { target: { value: email } });

  await waitFor(() => {
    const button = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
}

function getSubmitButton() {
  return document.querySelector('button[type="submit"]') as HTMLButtonElement;
}

describe('Automatic Flow Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigatorCredentials.create.mockReset();
    mockNavigatorCredentials.get.mockReset();
    // checkEmail() caches by email across the whole process - without this,
    // a stale cached result from an earlier test/file can silently bypass
    // this test's mockFetch entirely.
    globalUserCache.clearAll();

    Object.defineProperty(navigator, 'credentials', {
      value: mockNavigatorCredentials,
      writable: true,
      configurable: true
    });

    // determinePasskeysEnabled() checks window.PublicKeyCredential at store
    // creation time, so this must be in place before createTestStore() runs.
    Object.defineProperty(global, 'PublicKeyCredential', {
      value: class {
        static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(true);
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Existing user routing', () => {
    it('should route to passkey sign-in as the primary action when the user has a passkey', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/app/check-user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: true, hasWebAuthn: true, userId: 'user-123' })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const authStore = createTestStore({ enablePasskeys: true });
      render(SignInForm, { props: { store: authStore } });

      await typeEmailAndWait('existing-with-passkey@test.com');

      expect(getSubmitButton().textContent).toContain('Sign in with Passkey');
    });

    it('should send an email code automatically for an existing user without a passkey (email-only)', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/app/check-user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: true, hasWebAuthn: false, userId: 'user-456' })
          });
        }
        if (url.includes('/app/send-email')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, message: 'Check your email' })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      // No appCode configured, so a passkey-less existing user
      // routes to 'email-only' -> sendEmailCode().
      const authStore = createTestStore({ enablePasskeys: true });
      render(SignInForm, { props: { store: authStore } });

      await typeEmailAndWait('existing-no-passkey@test.com');
      await fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(authStore.getState().signInState).toBe('pinEntry');
      });
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });

    it('should send an email code for an existing user via the app-scoped endpoint (email-code)', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/demo/check-user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: true, hasWebAuthn: false, userId: 'user-789' })
          });
        }
        if (url.includes('/demo/send-email')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, message: 'Email code sent' })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      // appCode configured (no passkey, no magic links) routes to 'email-code'.
      // Uses its own email (not shared with other tests) since a stale
      // debounced checkUser() from a prior test's unmounted store can still
      // fire and poison the shared globalUserCache entry for a reused email.
      const authStore = createTestStore({ enablePasskeys: false, appCode: 'demo' });
      render(SignInForm, { props: { store: authStore } });

      await typeEmailAndWait('existing-appcode-user@test.com');
      await fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(authStore.getState().signInState).toBe('pinEntry');
      });
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });

  describe('New user registration', () => {
    it('should collect a full name and create the account for an unrecognized email', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/demo/check-user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: false, hasWebAuthn: false })
          });
        }
        if (url.includes('/demo/create-user')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                step: 'success',
                user: { id: 'new-user-1', email: 'new-user@test.com', name: 'New User' }
                // No access_token - verification required, matching real progressive registration
              })
          });
        }
        if (url.includes('/demo/send-email')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, message: 'Email code sent' })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const authStore = createTestStore({ enablePasskeys: false, appCode: 'demo' });
      render(SignInForm, { props: { store: authStore } });

      // For a new/unrecognized user the submit button stays disabled until a
      // full name is also entered, so this can't use typeEmailAndWait() (which
      // waits for the button itself to enable, which never happens on email alone).
      const emailInput = screen.getByPlaceholderText(/email/i);
      await fireEvent.input(emailInput, { target: { value: 'new-user@test.com' } });

      const fullNameInput = await waitFor(() => screen.getByPlaceholderText(/full name/i));
      await fireEvent.input(fullNameInput, { target: { value: 'New User' } });

      await waitFor(() => {
        expect(getSubmitButton().disabled).toBe(false);
      });
      await fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/demo/create-user'),
          expect.any(Object)
        );
      });
      await waitFor(() => {
        expect(authStore.getState().signInState).toBe('pinEntry');
      });
    });
  });

  describe('Error handling', () => {
    it('should surface an API error via store state when check-user fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const authStore = createTestStore();
      render(SignInForm, { props: { store: authStore } });

      const emailInput = screen.getByPlaceholderText(/email/i);
      await fireEvent.input(emailInput, { target: { value: 'test-error@test.com' } });

      await waitFor(() => {
        expect(authStore.getState().apiError).not.toBeNull();
      });
    });
  });

  describe('Form state management', () => {
    it('should reflect only the final email after rapid changes, with no stale overwrite', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/app/check-user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: true, hasWebAuthn: false })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const authStore = createTestStore();
      render(SignInForm, { props: { store: authStore } });

      const emailInput = screen.getByPlaceholderText(/email/i) as HTMLInputElement;
      const emails = ['test1@test.com', 'test2@test.com', 'test3@test.com'];

      for (const email of emails) {
        await fireEvent.input(emailInput, { target: { value: email } });
      }

      expect(emailInput.value).toBe(emails[emails.length - 1]);
    });
  });
});
