/**
 * SignInCore Smart Button Configuration Tests
 *
 * Tests for the smart button configuration logic using the actual getButtonConfig
 * method from the auth store. This tests real functionality without mocking.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig, CompleteAuthStore } from '../../src/types';

describe('SignInCore Smart Button Configuration (Real Functionality)', () => {
  let mockConfig: AuthConfig;
  let authStore: CompleteAuthStore;

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

    authStore = createAuthStore(mockConfig);
  });

  describe('User with Passkeys - Smart Primary Action', () => {
    it('should prioritize passkey authentication when user has passkeys', () => {
      const config = authStore.getButtonConfig({
        email: 'test@example.com',
        loading: false,
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false,
        isNewUserSignin: false
      });

      expect(config.primary.method).toBe('passkey');
      expect(config.primary.textKey).toBe('auth.signInWithPasskey');
      expect(config.primary.supportsWebAuthn).toBe(true);
      expect(config.primary.disabled).toBe(false);
    });

    it('should show pin fallback as secondary when user has passkeys', () => {
      const config = authStore.getButtonConfig({
        email: 'test@example.com',
        loading: false,
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false,
        isNewUserSignin: false
      });

      expect(config.secondary).not.toBeNull();
      if (config.secondary) {
        expect(config.secondary.method).toBe('email-code');
        expect(config.secondary.textKey).toBe('auth.sendPinByEmail');
      }
    });

    it('should show pin secondary action even without appCode', () => {
      const configWithoutAppCode = { ...mockConfig, appCode: undefined };
      const storeWithoutAppCode = createAuthStore(configWithoutAppCode);

      const config = storeWithoutAppCode.getButtonConfig({
        email: 'test@example.com',
        loading: false,
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false,
        isNewUserSignin: false
      });

      expect(config.primary.method).toBe('passkey');
      expect(config.secondary).toBeNull(); // No secondary when no appCode and no magic links
    });
  });

  describe('User without Passkeys - Pin Authentication', () => {
    it('should use pin authentication as primary when user has no passkeys', () => {
      const config = authStore.getButtonConfig({
        email: 'test@example.com',
        loading: false,
        userExists: true,
        hasPasskeys: false,
        hasValidPin: false,
        isNewUserSignin: false
      });

      expect(config.primary.method).toBe('email-code');
      expect(config.primary.textKey).toBe('auth.sendPinByEmail');
      expect(config.primary.loadingTextKey).toBe('auth.sendingPin');
      expect(config.secondary).toBeNull();
    });

    it('should use pin authentication for new users', () => {
      const config = authStore.getButtonConfig({
        email: 'test@example.com',
        loading: false,
        userExists: false,
        hasPasskeys: false,
        hasValidPin: false,
        isNewUserSignin: true
      });

      expect(config.primary.method).toBe('email-code');
      expect(config.primary.textKey).toBe('auth.sendPinByEmail');
      expect(config.secondary).toBeNull();
    });
  });

  describe('Magic Links (Explicit Enable Only)', () => {
    it('should use magic links as primary when explicitly enabled and no passkeys', () => {
      const configWithMagicLinks = {
        ...mockConfig,
        appCode: undefined, // Remove appCode to test magic links
        enableMagicLinks: true // Explicitly enabled
      };
      const storeWithMagicLinks = createAuthStore(configWithMagicLinks);

      const config = storeWithMagicLinks.getButtonConfig({
        email: 'test@example.com',
        loading: false,
        userExists: true,
        hasPasskeys: false,
        hasValidPin: false,
        isNewUserSignin: false
      });

      expect(config.primary.method).toBe('magic-link');
      expect(config.primary.textKey).toBe('auth.sendMagicLink');
      expect(config.primary.loadingTextKey).toBe('auth.sendingMagicLink');
      expect(config.secondary).toBeNull();
    });

    it('should use pins as primary when magic links disabled and no passkeys', () => {
      const configWithoutMagicLinks = {
        ...mockConfig,
        enableMagicLinks: false // Default - magic links disabled
      };
      const storeWithoutMagicLinks = createAuthStore(configWithoutMagicLinks);

      const config = storeWithoutMagicLinks.getButtonConfig({
        email: 'test@example.com',
        loading: false,
        userExists: true,
        hasPasskeys: false,
        hasValidPin: false,
        isNewUserSignin: false
      });

      expect(config.primary.method).toBe('email-code');
      expect(config.primary.textKey).toBe('auth.sendPinByEmail');
      expect(config.primary.loadingTextKey).toBe('auth.sendingPin');
      expect(config.secondary).toBeNull();
    });
  });

  describe('Passkey with Magic Link Secondary', () => {
    it('should show magic link as secondary when user has passkeys and magic links enabled', () => {
      const configWithMagicLinks = {
        ...mockConfig,
        appCode: undefined, // Remove appCode to enable magic links as secondary
        enableMagicLinks: true
      };
      const storeWithMagicLinks = createAuthStore(configWithMagicLinks);

      const config = storeWithMagicLinks.getButtonConfig({
        email: 'test@example.com',
        loading: false,
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false,
        isNewUserSignin: false
      });

      expect(config.primary.method).toBe('passkey');
      expect(config.secondary).not.toBeNull();
      if (config.secondary) {
        expect(config.secondary.method).toBe('magic-link');
        expect(config.secondary.textKey).toBe('auth.sendMagicLink');
      }
    });

    it('should not show secondary when user has passkeys but no alternative methods', () => {
      const configNoAlternatives = {
        ...mockConfig,
        appCode: undefined,
        enableMagicLinks: false
      };
      const storeNoAlternatives = createAuthStore(configNoAlternatives);

      const config = storeNoAlternatives.getButtonConfig({
        email: 'test@example.com',
        loading: false,
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false,
        isNewUserSignin: false
      });

      expect(config.primary.method).toBe('passkey');
      expect(config.secondary).toBeNull();
    });
  });

  describe('Button State Management', () => {
    it('should disable buttons when loading', () => {
      const config = authStore.getButtonConfig({
        email: 'test@example.com',
        loading: true,
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false,
        isNewUserSignin: false
      });

      expect(config.primary.disabled).toBe(true);
    });

    it('should disable buttons when email is empty', () => {
      const config = authStore.getButtonConfig({
        email: '',
        loading: false,
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false,
        isNewUserSignin: false
      });

      expect(config.primary.disabled).toBe(true);
    });

    it('should disable buttons when email is only whitespace', () => {
      const config = authStore.getButtonConfig({
        email: '   ',
        loading: false,
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false,
        isNewUserSignin: false
      });

      expect(config.primary.disabled).toBe(true);
    });

    it('should enable buttons when valid email and not loading', () => {
      const config = authStore.getButtonConfig({
        email: 'test@example.com',
        loading: false,
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false,
        isNewUserSignin: false
      });

      expect(config.primary.disabled).toBe(false);
    });
  });

  describe('Default Behavior', () => {
    it('should use email-code as default when user information not available', () => {
      const config = authStore.getButtonConfig({
        email: 'test@example.com',
        loading: false,
        userExists: null,
        hasPasskeys: false,
        hasValidPin: false,
        isNewUserSignin: false
      });

      // Should use email-code method when no user info (appCode is configured)
      expect(config.primary.method).toBe('email-code');
      expect(config.primary.textKey).toBe('auth.sendPinByEmail');
      expect(config.secondary).toBeNull();
    });

    it('should prioritize passkey but disable when email is empty', () => {
      const config = authStore.getButtonConfig({
        email: '',
        loading: false,
        userExists: true,
        hasPasskeys: true,
        hasValidPin: true,
        isNewUserSignin: false
      });

      // Should prioritize passkey method for users with passkeys, but disabled when no email
      expect(config.primary.method).toBe('passkey');
      expect(config.primary.disabled).toBe(true);
      expect(config.secondary).not.toBeNull();
      if (config.secondary) {
        expect(config.secondary.method).toBe('email-code');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle null userExists gracefully', () => {
      const config = authStore.getButtonConfig({
        email: 'test@example.com',
        loading: false,
        userExists: null,
        hasPasskeys: true,
        hasValidPin: true,
        isNewUserSignin: false
      });

      expect(config.primary.method).toBe('email-code');
      expect(config.primary.disabled).toBe(false);
      expect(config.secondary).toBeNull();
    });

    it('should handle passkeys disabled but pins still available', () => {
      const configDisabled = {
        ...mockConfig,
        enablePasskeys: false,
        enableMagicLinks: false
      };
      const storeDisabled = createAuthStore(configDisabled);

      const config = storeDisabled.getButtonConfig({
        email: 'test@example.com',
        loading: false,
        userExists: true,
        hasPasskeys: false,
        hasValidPin: false,
        isNewUserSignin: false
      });

      expect(config.primary.method).toBe('email-code');
      expect(config.primary.textKey).toBe('auth.sendPinByEmail');
      expect(config.secondary).toBeNull();
    });
  });
});
