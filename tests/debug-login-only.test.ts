import { render } from '@testing-library/svelte';
/**
 * Debug test for login-only message visibility
 * This test will help identify exactly why the message isn't showing
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInCore from '../src/components/core/SignInCore.svelte';
import { createAuthStore } from '../src/stores/auth-store';
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
    const mockConfig: AuthConfig = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      domain: 'test.com',
      enablePasskeys: false,
      enableMagicPins: true,
      enableErrorReporting: false,
      appCode: 'test',
      signInMode: 'login-only'
    };

    const mockAuthStore = createAuthStore(mockConfig);

    // Mock checkUser to return non-existing user
    vi.spyOn(mockAuthStore, 'checkUser').mockResolvedValue({
      exists: false,
      hasWebAuthn: false,
      lastPinExpiry: null,
      validPin: false,
      rateLimited: false
    });

    const { container } = render(SignInCore, {
      props: {
        config: mockConfig,
        authStore: mockAuthStore
      }
    });

    console.log('🐛 Initial DOM state:');
    console.log('Container HTML:', container.innerHTML);

    // Simulate email entry
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    expect(emailInput).toBeTruthy();

    emailInput.value = 'unregistered@test.com';
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait for debounced check
    await new Promise((resolve) => setTimeout(resolve, 600));

    console.log('🐛 After email entry and wait:');
    console.log('Container HTML:', container.innerHTML);

    // Look for any auth-message elements
    const messageElements = container.querySelectorAll('.auth-message');
    console.log('🐛 Found auth-message elements:', messageElements.length);

    messageElements.forEach((el, index) => {
      console.log(`🐛 Message ${index}:`, el.outerHTML);
    });

    // Look for the specific text
    const specificText = container.textContent?.includes('Only registered users can sign in');
    console.log('🐛 Contains specific text:', specificText);

    // Look for any elements with the translation key
    const translationElements = container.querySelectorAll(
      '[data-i18n], [aria-label*="only"], [title*="only"]'
    );
    console.log('🐛 Translation-related elements:', translationElements.length);

    // Check the current state of component variables by looking at data attributes or classes
    const signInSection = container.querySelector('.signin-section');
    console.log('🐛 SignIn section classes:', signInSection?.className);

    // Let's also check if there are any hidden or display:none elements
    const allElements = container.querySelectorAll('*');
    let hiddenElements = 0;
    allElements.forEach((el) => {
      const styles = window.getComputedStyle(el);
      if (styles.display === 'none' || styles.visibility === 'hidden') {
        hiddenElements++;
      }
    });
    console.log('🐛 Hidden elements count:', hiddenElements);
  });
});
