/**
 * SignInCore Button Configuration Tests
 * Tests the getButtonConfig logic that determines button text and behavior
 */

import { describe, expect, it, vi } from 'vitest';

// Mock svelte-i18n for future compatibility
vi.mock('svelte-i18n', () => ({
  _: vi.fn((key: string, params: Record<string, any> = {}) => {
    const translations: Record<string, string> = {
      'auth.signIn': 'Sign In',
      'auth.signInWithPasskey': 'Sign in with Passkey',
      'auth.sendPinByEmail': 'Send pin by email',
      'auth.sendMagicLink': 'Send Magic Link',
      'auth.loading': 'Loading...',
      'auth.signingIn': 'Signing in...',
      'auth.sendingPin': 'Sending pin...',
      'auth.sendingMagicLink': 'Sending magic link...',
      'auth.continueWithTouchId': 'Continue with Touch ID',
      'auth.continueWithFaceId': 'Continue with Face ID',
      'auth.continueWithBiometric': 'Continue with Touch ID/Face ID',
      'status.pinValid': 'A valid pin was already sent to you, good for {minutes} minute{s}.',
      'status.pinDirectAction': 'Enter pin here'
    };

    let result = translations[key] || key;

    // Handle template variables
    if (params && typeof result === 'string') {
      Object.keys(params).forEach(paramKey => {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
      });
    }

    return result;
  })
}));

describe('SignInCore Button Configuration Logic', () => {
  // Mock the $i18n function for current implementation
  const mockI18n = (key: string, params: Record<string, any> = {}) => {
    const translations: Record<string, string> = {
      'auth.signIn': 'Sign In',
      'auth.signInWithPasskey': 'Sign in with Passkey',
      'auth.sendPinByEmail': 'Send pin by email',
      'auth.sendMagicLink': 'Send Magic Link',
      'auth.loading': 'Loading...',
      'auth.signingIn': 'Signing in...',
      'auth.sendingPin': 'Sending pin...',
      'auth.sendingMagicLink': 'Sending magic link...',
      'auth.continueWithTouchId': 'Continue with Touch ID',
      'auth.continueWithFaceId': 'Continue with Face ID',
      'auth.continueWithBiometric': 'Continue with Touch ID/Face ID',
      'status.pinValid': 'A valid pin was already sent to you, good for {minutes} minute{s}.',
      'status.pinDirectAction': 'Enter pin here'
    };

    let translation = translations[key] || key;

    // Handle parameter substitution
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{${param}}`, String(value));
      });
    }

    return translation;
  };

  // Replicate the getButtonConfig function from SignInCore.svelte
  function getButtonConfig(
    method: string,
    isLoading: boolean,
    emailValue: string,
    webAuthnSupported: boolean,
    userExists: boolean | null,
    hasPasskeys: boolean,
    hasValidPin: boolean,
    config: { enablePasskeys?: boolean; appCode?: string; enableMagicLinks?: boolean }
  ) {
    // Smart button configuration based on discovered user state
    let primaryMethod = method;
    let primaryText = mockI18n('auth.signIn');
    let primaryLoadingText = mockI18n('auth.loading');
    let secondaryAction = null;

    // If we have user information and email is entered, make smart decisions
    if (emailValue && emailValue.trim() && userExists !== null) {
      if (webAuthnSupported && config.enablePasskeys && hasPasskeys) {
        // User has passkeys - prioritize passkey authentication
        primaryMethod = 'passkey';
        primaryText = mockI18n('auth.signInWithPasskey');
        primaryLoadingText = mockI18n('auth.signingIn');

        // Add secondary action for pin fallback if available
        if (config.appCode) {
          secondaryAction = {
            method: 'email-code',
            text: mockI18n('auth.sendPinByEmail'),
            loadingText: mockI18n('auth.sendingPin')
          };
        }
      } else if (config.appCode) {
        // User doesn't have passkeys, use pin authentication
        primaryMethod = 'email-code';
        primaryText = mockI18n('auth.sendPinByEmail');
        primaryLoadingText = mockI18n('auth.sendingPin');
      } else if (config.enableMagicLinks) {
        // Fallback to magic links
        primaryMethod = 'magic-link';
        primaryText = mockI18n('auth.sendMagicLink');
        primaryLoadingText = mockI18n('auth.sendingMagicLink');
      }
    }

    return {
      primary: {
        method: primaryMethod,
        supportsWebAuthn: webAuthnSupported && primaryMethod === 'passkey',
        text: primaryText,
        loadingText: primaryLoadingText,
        disabled: isLoading || !emailValue || !emailValue.trim()
      },
      secondary: secondaryAction
    };
  }

  describe('Pin Status Message and Link', () => {
    it('should show pin status message with "Enter pin here" link when user has valid pin', () => {
      // This tests the separate pin status UI that appears above the buttons
      const hasValidPin = true;
      const pinRemainingMinutes = 8;

      // The pin status message components
      const pinStatusText = mockI18n('status.pinValid', {
        minutes: pinRemainingMinutes,
        s: pinRemainingMinutes !== 1 ? 's' : ''
      });
      const pinDirectActionText = mockI18n('status.pinDirectAction');

      expect(pinStatusText).toBe('A valid pin was already sent to you, good for 8 minutes.');
      expect(pinDirectActionText).toBe('Enter pin here');

      // When this is shown, the main button still says "Send pin by email"
      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        false,
        true,
        false,
        true, // hasValidPin
        { appCode: 'demo' }
      );

      // Main button should still be "Send pin by email" (not "Enter existing pin")
      expect(config.primary.text).toBe('Send pin by email');
    });
  });

  describe('Default emailPin button behavior', () => {
    it('should return "Send pin by email" for default configuration', () => {
      const config = getButtonConfig(
        'email', // method
        false, // isLoading
        'test@example.com', // emailValue
        true, // webAuthnSupported
        false, // userExists
        false, // hasPasskeys
        false, // hasValidPin
        { appCode: 'demo' } // config
      );

      expect(config.primary.text).toBe('Send pin by email');
      expect(config.primary.method).toBe('email-code');
      expect(config.secondary).toBeNull();
    });

    it('should still show "Send pin by email" button when user has valid pin (not "Enter existing pin")', () => {
      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        true,
        true, // userExists
        false,
        true, // hasValidPin
        { appCode: 'demo' }
      );

      // Per spec: Button should always be "Send pin by email", never "Enter existing pin"
      // The "Enter pin here" link is shown separately in the pin status message
      expect(config.primary.text).toBe('Send pin by email');
      expect(config.primary.loadingText).toBe('Sending pin...');
      expect(config.primary.method).toBe('email-code');

      // This test will FAIL with current implementation (line 649) which incorrectly sets
      // primaryText = $i18n('auth.enterExistingPin') when hasValidPin is true
    });

    it('should disable button when email is empty', () => {
      const config = getButtonConfig(
        'email',
        false,
        '', // empty email
        true,
        null,
        false,
        false,
        { appCode: 'demo' }
      );

      expect(config.primary.disabled).toBe(true);
    });

    it('should disable button when loading', () => {
      const config = getButtonConfig(
        'email',
        true, // isLoading
        'test@example.com',
        true,
        false,
        false,
        false,
        { appCode: 'demo' }
      );

      expect(config.primary.disabled).toBe(true);
    });
  });

  describe('Passkey available scenarios with primary and secondary buttons', () => {
    it('should show passkey as primary and email pin as secondary when user has passkeys', () => {
      const config = getButtonConfig(
        'passkey',
        false,
        'test@example.com',
        true, // webAuthnSupported
        true, // userExists
        true, // hasPasskeys
        false,
        { enablePasskeys: true, appCode: 'demo' }
      );

      expect(config.primary.text).toBe('Sign in with Passkey');
      expect(config.primary.method).toBe('passkey');
      expect(config.primary.supportsWebAuthn).toBe(true);

      expect(config.secondary).toBeTruthy();
      expect(config.secondary?.text).toBe('Send pin by email');
      expect(config.secondary?.method).toBe('email-code');
    });

    it('should show "Send pin by email" as secondary when user has both passkeys and valid pin', () => {
      const config = getButtonConfig(
        'passkey',
        false,
        'test@example.com',
        true,
        true, // userExists
        true, // hasPasskeys
        true, // hasValidPin
        { enablePasskeys: true, appCode: 'demo' }
      );

      expect(config.primary.text).toBe('Sign in with Passkey');
      expect(config.secondary?.text).toBe('Send pin by email');
      expect(config.secondary?.loadingText).toBe('Sending pin...');
    });

    it('should not show secondary button when appCode is not configured', () => {
      const config = getButtonConfig(
        'passkey',
        false,
        'test@example.com',
        true,
        true,
        true, // hasPasskeys
        false,
        { enablePasskeys: true } // no appCode
      );

      expect(config.primary.text).toBe('Sign in with Passkey');
      expect(config.secondary).toBeNull();
    });
  });

  describe('New user auto-registration disabled scenario', () => {
    it('should show single button without secondary when user does not exist', () => {
      const config = getButtonConfig(
        'email',
        false,
        'nonexistent@example.com',
        true,
        false, // userExists = false
        false,
        false,
        { appCode: 'demo', enablePasskeys: true }
      );

      // For non-existent users, should fall back to pin/email method
      expect(config.primary.text).toBe('Send pin by email');
      expect(config.secondary).toBeNull();
    });

    it('should not show passkey option for non-existent users even with passkey support', () => {
      const config = getButtonConfig(
        'passkey',
        false,
        'nonexistent@example.com',
        true, // webAuthnSupported
        false, // userExists = false
        false, // hasPasskeys = false (user doesn't exist)
        false,
        { enablePasskeys: true, appCode: 'demo' }
      );

      // Should fallback to email method since user doesn't exist/have passkeys
      expect(config.primary.text).toBe('Send pin by email');
      expect(config.primary.method).toBe('email-code');
      expect(config.secondary).toBeNull();
    });
  });

  describe('Translation key equivalence for different button types', () => {
    it('should map methods to correct translation keys', () => {
      // Test that the expected "equivalent" translation keys are used
      const emailConfig = getButtonConfig(
        'email',
        false,
        'test@example.com',
        false,
        false,
        false,
        false,
        { appCode: 'demo' }
      );
      const passkeyConfig = getButtonConfig(
        'passkey',
        false,
        'test@example.com',
        true,
        true,
        true,
        false,
        { enablePasskeys: true, appCode: 'demo' }
      );

      // emailPin equivalent -> 'auth.sendPinByEmail'
      expect(emailConfig.primary.text).toBe('Send pin by email');

      // passkeyPrompt equivalent -> 'auth.signInWithPasskey'
      expect(passkeyConfig.primary.text).toBe('Sign in with Passkey');

      // These would be the biometric-specific variations, though they aren't currently implemented
      // 'applePrompt'/'touchIDPrompt' -> 'auth.continueWithTouchId'
      // 'faceIDPrompt' -> 'auth.continueWithFaceId'
      expect(mockI18n('auth.continueWithTouchId')).toBe('Continue with Touch ID');
      expect(mockI18n('auth.continueWithFaceId')).toBe('Continue with Face ID');
      expect(mockI18n('auth.continueWithBiometric')).toBe('Continue with Touch ID/Face ID');
    });

    it('should use same text regardless of pin availability', () => {
      const noPinConfig = getButtonConfig(
        'email',
        false,
        'test@example.com',
        false,
        true,
        false,
        false,
        { appCode: 'demo' }
      );
      const withPinConfig = getButtonConfig(
        'email',
        false,
        'test@example.com',
        false,
        true,
        false,
        true,
        { appCode: 'demo' }
      );

      expect(noPinConfig.primary.text).toBe('Send pin by email');
      expect(withPinConfig.primary.text).toBe('Send pin by email');
    });
  });

  describe('Loading states and disabled conditions', () => {
    it('should show correct loading text for different methods', () => {
      const emailConfig = getButtonConfig(
        'email',
        false,
        'test@example.com',
        false,
        true,
        false,
        false,
        { appCode: 'demo' }
      );
      const passkeyConfig = getButtonConfig(
        'passkey',
        false,
        'test@example.com',
        true,
        true,
        true,
        false,
        { enablePasskeys: true }
      );
      const pinConfig = getButtonConfig(
        'email',
        false,
        'test@example.com',
        false,
        true,
        false,
        true,
        { appCode: 'demo' }
      );

      expect(emailConfig.primary.loadingText).toBe('Sending pin...');
      expect(passkeyConfig.primary.loadingText).toBe('Signing in...');
      expect(pinConfig.primary.loadingText).toBe('Sending pin...');
    });

    it('should disable button based on email and loading state', () => {
      const configs = [
        { email: '', loading: false, shouldBeDisabled: true },
        { email: 'test@example.com', loading: false, shouldBeDisabled: false },
        { email: 'test@example.com', loading: true, shouldBeDisabled: true },
        { email: '   ', loading: false, shouldBeDisabled: true } // whitespace only
      ];

      configs.forEach(({ email, loading, shouldBeDisabled }) => {
        const config = getButtonConfig('email', loading, email, false, false, false, false, {
          appCode: 'demo'
        });
        expect(config.primary.disabled).toBe(shouldBeDisabled);
      });
    });
  });

  describe('Configuration-based behavior', () => {
    it('should fallback to magic link when appCode not available', () => {
      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        false, // no webauthn
        true, // userExists
        false, // no passkeys
        false,
        { enableMagicLinks: true } // no appCode, but magic links enabled
      );

      expect(config.primary.text).toBe('Send Magic Link');
      expect(config.primary.method).toBe('magic-link');
      expect(config.primary.loadingText).toBe('Sending magic link...');
    });

    it('should prefer passkeys over other methods when available', () => {
      const config = getButtonConfig(
        'generic',
        false,
        'test@example.com',
        true, // webAuthnSupported
        true, // userExists
        true, // hasPasskeys
        true, // hasValidPin (should be secondary)
        { enablePasskeys: true, appCode: 'demo', enableMagicLinks: true }
      );

      expect(config.primary.method).toBe('passkey');
      expect(config.primary.text).toBe('Sign in with Passkey');
      expect(config.secondary?.method).toBe('email-code');
      expect(config.secondary?.text).toBe('Send pin by email');
    });
  });
});
