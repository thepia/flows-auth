/**
 * SignInCore Smart Button Configuration Tests
 *
 * Tests for the new smart button configuration logic that prioritizes
 * passkey authentication when available and provides appropriate secondary actions.
 * 
 * This needs to be replaced by an actual test. It currently tests a local function.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthConfig } from '../../src/types';

describe('SignInCore Smart Button Configuration', () => {
  let mockConfig: AuthConfig;

  beforeEach(() => {
    mockConfig = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      domain: 'test.com',
      enablePasskeys: true,
      enableMagicLinks: false,
      signInMode: 'login-or-register',
      appCode: 'demo'
    };
  });

  // Simulate the getButtonConfig logic from SignInCore
  function getButtonConfig(
    method: string,
    isLoading: boolean,
    emailValue: string,
    webAuthnSupported: boolean,
    userExists: boolean | null,
    hasPasskeys: boolean,
    hasValidPin: boolean,
    config: AuthConfig
  ) {
    // Smart button configuration based on discovered user state
    let primaryMethod = method;
    let primaryText = 'Sign In';
    let primaryLoadingText = 'Loading...';
    let secondaryAction = null;

    // If we have user information and email is entered, make smart decisions
    if (emailValue && emailValue.trim() && userExists !== null) {
      if (webAuthnSupported && config.enablePasskeys && hasPasskeys) {
        // User has passkeys - prioritize passkey authentication
        primaryMethod = 'passkey';
        primaryText = 'Sign in with Passkey';
        primaryLoadingText = 'Signing in with Passkey...';

        // Pins are always available as secondary action
        secondaryAction = {
          method: 'email-code',
          text: hasValidPin ? 'Enter existing pin' : 'Send pin by email',
          loadingText: hasValidPin ? 'Verifying pin...' : 'Sending pin...'
        };
      } else if (config.enableMagicLinks) {
        // Magic links explicitly enabled - use as primary
        primaryMethod = 'magic-link';
        primaryText = 'Send Magic Link';
        primaryLoadingText = 'Sending magic link...';
      } else {
        // No passkeys available - use pin authentication as primary
        primaryMethod = 'email-code';
        if (hasValidPin) {
          primaryText = 'Enter existing pin';
          primaryLoadingText = 'Verifying pin...';
        } else {
          primaryText = 'Send pin by email';
          primaryLoadingText = 'Sending pin...';
        }
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

  describe('User with Passkeys - Smart Primary Action', () => {
    it('should prioritize passkey authentication when user has passkeys', () => {
      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        true,
        true,
        true,
        false,
        mockConfig
      );

      expect(config.primary.method).toBe('passkey');
      expect(config.primary.text).toBe('Sign in with Passkey');
      expect(config.primary.supportsWebAuthn).toBe(true);
      expect(config.primary.disabled).toBe(false);
    });

    it('should show pin fallback as secondary when user has passkeys', () => {
      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        true,
        true,
        true,
        false,
        mockConfig
      );

      expect(config.secondary).not.toBeNull();
      expect(config.secondary!.method).toBe('email-code');
      expect(config.secondary!.text).toBe('Send pin by email');
    });

    it('should show "Enter existing pin" as secondary when user has passkeys and valid pin', () => {
      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        true,
        true,
        true,
        true,
        mockConfig
      );

      expect(config.secondary).not.toBeNull();
      expect(config.secondary!.method).toBe('email-code');
      expect(config.secondary!.text).toBe('Enter existing pin');
      expect(config.secondary!.loadingText).toBe('Verifying pin...');
    });

    it('should show pin secondary action even without appCode', () => {
      const configWithoutAppCode = { ...mockConfig, appCode: undefined };
      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        true,
        true,
        true,
        false,
        configWithoutAppCode
      );

      expect(config.primary.method).toBe('passkey');
      expect(config.secondary).not.toBeNull();
      expect(config.secondary!.method).toBe('email-code');
      expect(config.secondary!.text).toBe('Send pin by email');
    });
  });

  describe('User without Passkeys - Pin Authentication', () => {
    it('should use pin authentication as primary when user has no passkeys', () => {
      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        true,
        true,
        false,
        false,
        mockConfig
      );

      expect(config.primary.method).toBe('email-code');
      expect(config.primary.text).toBe('Send pin by email');
      expect(config.primary.loadingText).toBe('Sending pin...');
      expect(config.secondary).toBeNull();
    });

    it('should show "Enter existing pin" as primary when user has no passkeys but valid pin', () => {
      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        true,
        true,
        false,
        true,
        mockConfig
      );

      expect(config.primary.method).toBe('email-code');
      expect(config.primary.text).toBe('Enter existing pin');
      expect(config.primary.loadingText).toBe('Verifying pin...');
      expect(config.secondary).toBeNull();
    });
  });

  describe('Magic Links (Explicit Enable Only)', () => {
    it('should use magic links as primary when explicitly enabled and no passkeys', () => {
      const configWithMagicLinks = {
        ...mockConfig,
        enableMagicLinks: true  // Explicitly enabled
      };

      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        true,
        true,
        false,
        false,
        configWithMagicLinks
      );

      expect(config.primary.method).toBe('magic-link');
      expect(config.primary.text).toBe('Send Magic Link');
      expect(config.primary.loadingText).toBe('Sending magic link...');
      expect(config.secondary).toBeNull();
    });

    it('should use pins as primary when magic links disabled and no passkeys', () => {
      const configWithoutMagicLinks = {
        ...mockConfig,
        enableMagicLinks: false  // Default - magic links disabled
      };

      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        true,
        true,
        false,
        false,
        configWithoutMagicLinks
      );

      expect(config.primary.method).toBe('email-code');
      expect(config.primary.text).toBe('Send pin by email');
      expect(config.primary.loadingText).toBe('Sending pin...');
      expect(config.secondary).toBeNull();
    });
  });

  describe('WebAuthn Not Supported - Fallback Behavior', () => {
    it('should fall back to pin when user has passkeys but WebAuthn not supported', () => {
      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        false,
        true,
        true,
        false,
        mockConfig
      );

      expect(config.primary.method).toBe('email-code');
      expect(config.primary.text).toBe('Send pin by email');
      expect(config.secondary).toBeNull();
    });

    it('should fall back to magic link when user has passkeys but WebAuthn not supported and magic links enabled', () => {
      const configWithMagicLinks = {
        ...mockConfig,
        enableMagicLinks: true  // Explicitly enabled
      };

      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        false,
        true,
        true,
        false,
        configWithMagicLinks
      );

      expect(config.primary.method).toBe('magic-link');
      expect(config.primary.text).toBe('Send Magic Link');
      expect(config.secondary).toBeNull();
    });

    it('should fall back to pin when user has passkeys but WebAuthn not supported and magic links disabled', () => {
      const configWithoutMagicLinks = {
        ...mockConfig,
        enableMagicLinks: false  // Default - disabled
      };

      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        false,
        true,
        true,
        false,
        configWithoutMagicLinks
      );

      expect(config.primary.method).toBe('email-code');
      expect(config.primary.text).toBe('Send pin by email');
      expect(config.secondary).toBeNull();
    });
  });

  describe('Button State Management', () => {
    it('should disable buttons when loading', () => {
      const config = getButtonConfig(
        'email',
        true,
        'test@example.com',
        true,
        true,
        true,
        false,
        mockConfig
      );

      expect(config.primary.disabled).toBe(true);
    });

    it('should disable buttons when email is empty', () => {
      const config = getButtonConfig('email', false, '', true, true, true, false, mockConfig);

      expect(config.primary.disabled).toBe(true);
    });

    it('should disable buttons when email is only whitespace', () => {
      const config = getButtonConfig('email', false, '   ', true, true, true, false, mockConfig);

      expect(config.primary.disabled).toBe(true);
    });

    it('should enable buttons when valid email and not loading', () => {
      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        true,
        true,
        true,
        false,
        mockConfig
      );

      expect(config.primary.disabled).toBe(false);
    });
  });

  describe('No User Information - Default Behavior', () => {
    it('should use default configuration when user information not available', () => {
      const config = getButtonConfig(
        'email',
        false,
        'test@example.com',
        true,
        null,
        false,
        false,
        mockConfig
      );

      // Should use original method when no user info
      expect(config.primary.method).toBe('email');
      expect(config.primary.text).toBe('Sign In');
      expect(config.secondary).toBeNull();
    });

    it('should use default configuration when email is empty', () => {
      const config = getButtonConfig('email', false, '', true, true, true, true, mockConfig);

      // Should use original method when no email
      expect(config.primary.method).toBe('email');
      expect(config.primary.text).toBe('Sign In');
      expect(config.secondary).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null userExists gracefully', () => {
      const config = getButtonConfig(
        'passkey',
        false,
        'test@example.com',
        true,
        null,
        true,
        true,
        mockConfig
      );

      expect(config.primary.method).toBe('passkey');
      expect(config.secondary).toBeNull();
    });

    it('should handle passkeys disabled but pins still available', () => {
      const configDisabled = {
        ...mockConfig,
        enablePasskeys: false,
        enableMagicLinks: false
      };

      const config = getButtonConfig(
        'generic',
        false,
        'test@example.com',
        true,
        true,
        false,
        false,
        configDisabled
      );

      expect(config.primary.method).toBe('email-code');
      expect(config.primary.text).toBe('Send pin by email');
      expect(config.secondary).toBeNull();
    });
  });
});
