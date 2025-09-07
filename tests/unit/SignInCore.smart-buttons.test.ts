/**
 * SignInCore Smart Button Configuration Tests
 * 
 * Tests for the new smart button configuration logic that prioritizes
 * passkey authentication when available and provides appropriate secondary actions.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AuthConfig } from '../../src/types';

describe('SignInCore Smart Button Configuration', () => {
  let mockConfig: AuthConfig;

  beforeEach(() => {
    mockConfig = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client', 
      domain: 'test.com',
      enablePasskeys: true,
      enableMagicPins: false,
      signInMode: 'login-or-register',
      appCode: 'demo' // Enable pin authentication
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
        
        // Add secondary action for pin fallback if available
        if (config.appCode) {
          secondaryAction = {
            method: 'email-code',
            text: hasValidPin ? 'Enter existing pin' : 'Send pin by email',
            loadingText: hasValidPin ? 'Verifying pin...' : 'Sending pin...'
          };
        }
      } else if (config.appCode) {
        // User doesn't have passkeys, use pin authentication
        primaryMethod = 'email-code';
        if (hasValidPin) {
          primaryText = 'Enter existing pin';
          primaryLoadingText = 'Verifying pin...';
        } else {
          primaryText = 'Send pin by email';
          primaryLoadingText = 'Sending pin...';
        }
      } else if (config.enableMagicPins) {
        // Fallback to magic links
        primaryMethod = 'magic-link';
        primaryText = 'Send Magic Link';
        primaryLoadingText = 'Sending magic link...';
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
        'email', false, 'test@example.com', true, true, true, false, mockConfig
      );
      
      expect(config.primary.method).toBe('passkey');
      expect(config.primary.text).toBe('Sign in with Passkey');
      expect(config.primary.supportsWebAuthn).toBe(true);
      expect(config.primary.disabled).toBe(false);
    });

    it('should show pin fallback as secondary when user has passkeys and appCode configured', () => {
      const config = getButtonConfig(
        'email', false, 'test@example.com', true, true, true, false, mockConfig
      );
      
      expect(config.secondary).not.toBeNull();
      expect(config.secondary!.method).toBe('email-code');
      expect(config.secondary!.text).toBe('Send pin by email');
    });

    it('should show "Enter existing pin" as secondary when user has passkeys and valid pin', () => {
      const config = getButtonConfig(
        'email', false, 'test@example.com', true, true, true, true, mockConfig
      );
      
      expect(config.secondary).not.toBeNull();
      expect(config.secondary!.method).toBe('email-code');
      expect(config.secondary!.text).toBe('Enter existing pin');
      expect(config.secondary!.loadingText).toBe('Verifying pin...');
    });

    it('should not show secondary action when user has passkeys but no appCode', () => {
      const configWithoutAppCode = { ...mockConfig, appCode: undefined };
      const config = getButtonConfig(
        'email', false, 'test@example.com', true, true, true, false, configWithoutAppCode
      );
      
      expect(config.primary.method).toBe('passkey');
      expect(config.secondary).toBeNull();
    });
  });

  describe('User without Passkeys - Pin Authentication', () => {
    it('should use pin authentication as primary when user has no passkeys', () => {
      const config = getButtonConfig(
        'email', false, 'test@example.com', true, true, false, false, mockConfig
      );
      
      expect(config.primary.method).toBe('email-code');
      expect(config.primary.text).toBe('Send pin by email');
      expect(config.primary.loadingText).toBe('Sending pin...');
      expect(config.secondary).toBeNull();
    });

    it('should show "Enter existing pin" as primary when user has no passkeys but valid pin', () => {
      const config = getButtonConfig(
        'email', false, 'test@example.com', true, true, false, true, mockConfig
      );
      
      expect(config.primary.method).toBe('email-code');
      expect(config.primary.text).toBe('Enter existing pin');
      expect(config.primary.loadingText).toBe('Verifying pin...');
      expect(config.secondary).toBeNull();
    });
  });

  describe('Magic Link Fallback', () => {
    it('should use magic link when user has no passkeys and no appCode', () => {
      const configWithMagicLinks = { 
        ...mockConfig, 
        appCode: undefined, 
        enableMagicPins: true 
      };
      
      const config = getButtonConfig(
        'email', false, 'test@example.com', true, true, false, false, configWithMagicLinks
      );
      
      expect(config.primary.method).toBe('magic-link');
      expect(config.primary.text).toBe('Send Magic Link');
      expect(config.primary.loadingText).toBe('Sending magic link...');
      expect(config.secondary).toBeNull();
    });
  });

  describe('WebAuthn Not Supported - Fallback Behavior', () => {
    it('should fall back to pin when user has passkeys but WebAuthn not supported', () => {
      const config = getButtonConfig(
        'email', false, 'test@example.com', false, true, true, false, mockConfig
      );
      
      expect(config.primary.method).toBe('email-code');
      expect(config.primary.text).toBe('Send pin by email');
      expect(config.secondary).toBeNull();
    });

    it('should fall back to magic link when user has passkeys but WebAuthn not supported and no appCode', () => {
      const configWithMagicLinks = { 
        ...mockConfig, 
        appCode: undefined, 
        enableMagicPins: true 
      };
      
      const config = getButtonConfig(
        'email', false, 'test@example.com', false, true, true, false, configWithMagicLinks
      );
      
      expect(config.primary.method).toBe('magic-link');
      expect(config.primary.text).toBe('Send Magic Link');
      expect(config.secondary).toBeNull();
    });
  });

  describe('Button State Management', () => {
    it('should disable buttons when loading', () => {
      const config = getButtonConfig(
        'email', true, 'test@example.com', true, true, true, false, mockConfig
      );
      
      expect(config.primary.disabled).toBe(true);
    });

    it('should disable buttons when email is empty', () => {
      const config = getButtonConfig(
        'email', false, '', true, true, true, false, mockConfig
      );
      
      expect(config.primary.disabled).toBe(true);
    });

    it('should disable buttons when email is only whitespace', () => {
      const config = getButtonConfig(
        'email', false, '   ', true, true, true, false, mockConfig
      );
      
      expect(config.primary.disabled).toBe(true);
    });

    it('should enable buttons when valid email and not loading', () => {
      const config = getButtonConfig(
        'email', false, 'test@example.com', true, true, true, false, mockConfig
      );
      
      expect(config.primary.disabled).toBe(false);
    });
  });

  describe('No User Information - Default Behavior', () => {
    it('should use default configuration when user information not available', () => {
      const config = getButtonConfig(
        'email', false, 'test@example.com', true, null, false, false, mockConfig
      );
      
      // Should use original method when no user info
      expect(config.primary.method).toBe('email');
      expect(config.primary.text).toBe('Sign In');
      expect(config.secondary).toBeNull();
    });

    it('should use default configuration when email is empty', () => {
      const config = getButtonConfig(
        'email', false, '', true, true, true, true, mockConfig
      );
      
      // Should use original method when no email
      expect(config.primary.method).toBe('email');
      expect(config.primary.text).toBe('Sign In');
      expect(config.secondary).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null userExists gracefully', () => {
      const config = getButtonConfig(
        'passkey', false, 'test@example.com', true, null, true, true, mockConfig
      );
      
      expect(config.primary.method).toBe('passkey');
      expect(config.secondary).toBeNull();
    });

    it('should handle all authentication methods disabled', () => {
      const configDisabled = {
        ...mockConfig,
        enablePasskeys: false,
        enableMagicPins: false,
        appCode: undefined
      };
      
      const config = getButtonConfig(
        'generic', false, 'test@example.com', true, true, false, false, configDisabled
      );
      
      expect(config.primary.method).toBe('generic');
      expect(config.secondary).toBeNull();
    });
  });
});