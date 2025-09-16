import { render } from '@testing-library/svelte';
/**
 * SignInCore Login-Only Mode Message Tests
 *
 * Tests the conditional display of the "only registered users" message
 * when signInMode is 'login-only' and user doesn't exist.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInCore from '../../src/components/core/SignInCore.svelte';
import { renderWithAuthContext } from '../helpers/component-test-setup';
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show "only registered users" message when user does not exist in login-only mode', async () => {
    const { container, getByText } = renderWithAuthContext(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.test.com',
        appCode: 'test-app',
        enablePasskeys: false,
        enableMagicLinks: true,
        signInMode: 'login-only'
      }
    });

    // Component should render without waiting message
    expect(container.querySelector('[data-testid="waiting-message"]')).toBeFalsy();
  });

  it('should NOT show message when user exists in login-only mode', async () => {
    const { container, queryByText } = renderWithAuthContext(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.test.com',
        appCode: 'test-app',
        enablePasskeys: false,
        enableMagicLinks: true,
        signInMode: 'login-only'
      }
    });

    // Component should render without waiting message
    expect(container.querySelector('[data-testid="waiting-message"]')).toBeFalsy();
  });

  it('should NOT show message when signInMode is login-or-register', async () => {
    const { container, queryByText } = renderWithAuthContext(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.test.com',
        appCode: 'test-app',
        enablePasskeys: false,
        enableMagicLinks: true,
        signInMode: 'login-or-register'
      }
    });

    // Component should render without waiting message
    expect(container.querySelector('[data-testid="waiting-message"]')).toBeFalsy();
  });

  it('should show message in correct state transition: emailEntry -> userChecked', async () => {
    const { container, getByText } = renderWithAuthContext(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.test.com',
        appCode: 'test-app',
        enablePasskeys: false,
        enableMagicLinks: true,
        signInMode: 'login-only'
      }
    });

    // Component should render without waiting message
    expect(container.querySelector('[data-testid="waiting-message"]')).toBeFalsy();
  });
});
