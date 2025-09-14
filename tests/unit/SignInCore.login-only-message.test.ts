import { render } from '@testing-library/svelte';
/**
 * SignInCore Login-Only Mode Message Tests
 *
 * Tests the conditional display of the "only registered users" message
 * when signInMode is 'login-only' and user doesn't exist.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInCore from '../../src/components/core/SignInCore.svelte';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig } from '../../src/types';

// Mock WebAuthn utilities
vi.mock('../../src/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn(() => false),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false)),
  startConditionalAuthentication: vi.fn(() => Promise.resolve())
}));

// Mock error reporter
vi.mock('../../src/utils/errorReporter', () => ({
  reportError: vi.fn()
}));

describe('SignInCore Login-Only Mode Message', () => {
  let mockConfig: AuthConfig;
  let mockAuthStore: ReturnType<typeof createAuthStore>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      domain: 'test.com',
      enablePasskeys: false,
      enableMagicPins: true,
      enableErrorReporting: false,
      appCode: 'test',
      signInMode: 'login-only'
    };

    // Create a mock auth store
    mockAuthStore = createAuthStore(mockConfig);

    // Mock checkUser to simulate non-existing user
    vi.spyOn(mockAuthStore, 'checkUser').mockResolvedValue({
      exists: false,
      hasWebAuthn: false,
      lastPinExpiry: null,
      validPin: false,
      rateLimited: false
    });
  });

  it('should show "only registered users" message when user does not exist in login-only mode', async () => {
    const { container, getByText } = render(SignInCore, {
      props: {
        config: mockConfig,
        authStore: mockAuthStore
      }
    });

    // Simulate user entering an unregistered email
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    expect(emailInput).toBeTruthy();

    // Trigger email change and wait for user check
    emailInput.value = 'unregistered@test.com';
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait for debounced email check (500ms) and message to appear
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Check if the message appears
    expect(
      getByText('Only registered users can sign in. Please contact support if you need access.')
    ).toBeTruthy();
  });

  it('should NOT show message when user exists in login-only mode', async () => {
    // Mock checkUser to return existing user
    vi.spyOn(mockAuthStore, 'checkUser').mockResolvedValue({
      exists: true,
      hasWebAuthn: false,
      lastPinExpiry: null,
      validPin: false,
      rateLimited: false
    });

    const { container, queryByText } = render(SignInCore, {
      props: {
        config: mockConfig,
        authStore: mockAuthStore
      }
    });

    // Simulate user entering a registered email
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    emailInput.value = 'registered@test.com';
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait for debounced email check
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Message should NOT appear
    expect(
      queryByText('Only registered users can sign in. Please contact support if you need access.')
    ).toBeFalsy();
  });

  it('should NOT show message when signInMode is login-or-register', async () => {
    // Change config to login-or-register mode
    const loginOrRegisterConfig = {
      ...mockConfig,
      signInMode: 'login-or-register' as const
    };

    const { container, queryByText } = render(SignInCore, {
      props: {
        config: loginOrRegisterConfig,
        authStore: mockAuthStore
      }
    });

    // Simulate user entering an unregistered email
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    emailInput.value = 'unregistered@test.com';
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait for debounced email check
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Message should NOT appear in login-or-register mode
    expect(
      queryByText('Only registered users can sign in. Please contact support if you need access.')
    ).toBeFalsy();
  });

  it('should show message in correct state transition: emailEntry -> userChecked', async () => {
    const { container, getByText } = render(SignInCore, {
      props: {
        config: mockConfig,
        authStore: mockAuthStore
      }
    });

    // Initially should be in emailEntry state - no message
    expect(container.querySelector('.auth-state-message')).toBeFalsy();

    // Simulate email entry and user check
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    emailInput.value = 'unregistered@test.com';
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait for the reactive statement to trigger checkUser and state transition
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Now should be in userChecked state with userExists = false
    // The message should appear
    const message = getByText(
      'Only registered users can sign in. Please contact support if you need access.'
    );
    expect(message).toBeTruthy();
  });
});
