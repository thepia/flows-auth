import { render } from '@testing-library/svelte';
/**
 * Debug test for login-only message visibility
 * This test will help identify exactly why the message isn't showing
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInCore from '../src/components/core/SignInCore.svelte';
import { renderWithAuthContext } from './helpers/component-test-setup';
import type { AuthConfig } from '../src/types';

// Mock WebAuthn utilities
vi.mock('../src/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn(() => false),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false)),
  startConditionalAuthentication: vi.fn(() => Promise.resolve())
}));

// Mock error reporter
vi.mock('../src/utils/errorReporter', () => ({
  reportError: vi.fn()
}));

describe('Debug Login-Only Message', () => {
  it('should show detailed debugging info', async () => {
    const { container } = renderWithAuthContext(SignInCore, {
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
