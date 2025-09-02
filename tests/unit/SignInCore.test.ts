/**
 * SignInCore Logic Tests
 * 
 * Unit tests for SignInCore component logic without rendering.
 * Tests the authentication method determination and button configuration logic.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AuthConfig } from '../../src/types';
import * as webauthnUtils from '../../src/utils/webauthn';

// Mock WebAuthn utilities
vi.mock('../../src/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn(),
  isPlatformAuthenticatorAvailable: vi.fn(),
}));

const mockIsWebAuthnSupported = webauthnUtils.isWebAuthnSupported as any;

describe('SignInCore Logic', () => {
  let mockConfig: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsWebAuthnSupported.mockReturnValue(true);
    
    mockConfig = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      domain: 'test.com',
      enablePasskeys: false,
      enableMagicLinks: true,
      signInMode: 'login-or-register'
    };
  });

  describe('Authentication Method Determination Logic', () => {
    // Simulate the getAuthMethodForUI logic from SignInCore
    function getAuthMethodForUI(config: AuthConfig, supportsWebAuthn: boolean): 'passkey' | 'email' | 'generic' {
      if (config.enablePasskeys && supportsWebAuthn) return 'passkey';
      if (config.enableMagicLinks) return 'email';
      return 'generic';
    }

    it('should return "email" when only magic links are enabled', () => {
      const config = {
        ...mockConfig,
        enablePasskeys: false,
        enableMagicLinks: true
      };

      const result = getAuthMethodForUI(config, true);
      expect(result).toBe('email');
    });

    it('should return "passkey" when both passkeys and magic links are enabled and WebAuthn supported', () => {
      const config = {
        ...mockConfig,
        enablePasskeys: true,
        enableMagicLinks: true
      };

      const result = getAuthMethodForUI(config, true);
      expect(result).toBe('passkey');
    });

    it('should return "email" when passkeys enabled but WebAuthn not supported, with magic links enabled', () => {
      const config = {
        ...mockConfig,
        enablePasskeys: true,
        enableMagicLinks: true
      };

      const result = getAuthMethodForUI(config, false);
      expect(result).toBe('email');
    });

    it('should return "generic" when passkeys enabled but WebAuthn not supported and no magic links', () => {
      const config = {
        ...mockConfig,
        enablePasskeys: true,
        enableMagicLinks: false
      };

      const result = getAuthMethodForUI(config, false);
      expect(result).toBe('generic');
    });

    it('should return "generic" when no authentication methods are enabled', () => {
      const config = {
        ...mockConfig,
        enablePasskeys: false,
        enableMagicLinks: false
      };

      const result = getAuthMethodForUI(config, true);
      expect(result).toBe('generic');
    });
  });

  describe('Button Configuration Logic', () => {
    // Simulate the button configuration logic from SignInCore
    function getButtonConfig(authMethod: 'passkey' | 'email' | 'generic', loading: boolean, email: string, supportsWebAuthn: boolean) {
      return {
        method: authMethod,
        supportsWebAuthn,
        disabled: loading || !email.trim()
      };
    }

    it('should enable button when valid email is provided and not loading', () => {
      const config = getButtonConfig('email', false, 'test@example.com', false);
      
      expect(config.disabled).toBe(false);
      expect(config.method).toBe('email');
    });

    it('should disable button when email is empty', () => {
      const config = getButtonConfig('email', false, '', false);
      
      expect(config.disabled).toBe(true);
    });

    it('should disable button when email is only whitespace', () => {
      const config = getButtonConfig('email', false, '   ', false);
      
      expect(config.disabled).toBe(true);
    });

    it('should disable button during loading state even with valid email', () => {
      const config = getButtonConfig('email', true, 'test@example.com', false);
      
      expect(config.disabled).toBe(true);
    });

    it('should configure passkey method when passkeys are supported', () => {
      const config = getButtonConfig('passkey', false, 'test@example.com', true);
      
      expect(config.method).toBe('passkey');
      expect(config.supportsWebAuthn).toBe(true);
      expect(config.disabled).toBe(false);
    });
  });

  describe('Email Input Autocomplete Logic', () => {
    // Simulate the email autocomplete logic from SignInCore
    function getEmailInputWebAuthnEnabled(config: AuthConfig, supportsWebAuthn: boolean): boolean {
      return supportsWebAuthn && config.enablePasskeys;
    }

    it('should enable WebAuthn autocomplete when passkeys enabled and supported', () => {
      const config = {
        ...mockConfig,
        enablePasskeys: true
      };

      const result = getEmailInputWebAuthnEnabled(config, true);
      expect(result).toBe(true);
    });

    it('should disable WebAuthn autocomplete when passkeys disabled', () => {
      const config = {
        ...mockConfig,
        enablePasskeys: false
      };

      const result = getEmailInputWebAuthnEnabled(config, true);
      expect(result).toBe(false);
    });

    it('should disable WebAuthn autocomplete when WebAuthn not supported', () => {
      const config = {
        ...mockConfig,
        enablePasskeys: true
      };

      const result = getEmailInputWebAuthnEnabled(config, false);
      expect(result).toBe(false);
    });
  });

  describe('User Existence Handling Logic', () => {
    // Simulate the user existence handling logic from SignInCore
    function shouldTransitionToRegistration(userExists: boolean, signInMode?: string): boolean {
      if (userExists) return false;
      return signInMode !== 'login-only';
    }

    it('should not transition to registration when user exists', () => {
      const result = shouldTransitionToRegistration(true, 'login-or-register');
      expect(result).toBe(false);
    });

    it('should transition to registration when user does not exist and signInMode allows registration', () => {
      const result = shouldTransitionToRegistration(false, 'login-or-register');
      expect(result).toBe(true);
    });

    it('should not transition to registration when user does not exist and signInMode is login-only', () => {
      const result = shouldTransitionToRegistration(false, 'login-only');
      expect(result).toBe(false);
    });

    it('should transition to registration when user does not exist and signInMode is undefined (default behavior)', () => {
      const result = shouldTransitionToRegistration(false, undefined);
      expect(result).toBe(true);
    });
  });

  describe('Authentication Method Determination for Existing Users', () => {
    // Simulate the determineAuthMethod logic from SignInCore
    function determineAuthMethod(
      userCheck: { hasWebAuthn: boolean }, 
      config: AuthConfig, 
      supportsWebAuthn: boolean
    ): 'passkey-only' | 'passkey-with-fallback' | 'email-only' | 'none' {
      const hasPasskeys = userCheck.hasWebAuthn;

      if (hasPasskeys && supportsWebAuthn && config.enablePasskeys) {
        return config.enableMagicLinks ? 'passkey-with-fallback' : 'passkey-only';
      }
      
      if (config.enableMagicLinks) {
        return 'email-only';
      }

      return 'none';
    }

    it('should return email-only for existing user without passkeys when magic links enabled', () => {
      const userCheck = { hasWebAuthn: false };
      const config = {
        ...mockConfig,
        enablePasskeys: false,
        enableMagicLinks: true
      };

      const result = determineAuthMethod(userCheck, config, true);
      expect(result).toBe('email-only');
    });

    it('should return passkey-with-fallback for user with passkeys when both methods enabled', () => {
      const userCheck = { hasWebAuthn: true };
      const config = {
        ...mockConfig,
        enablePasskeys: true,
        enableMagicLinks: true
      };

      const result = determineAuthMethod(userCheck, config, true);
      expect(result).toBe('passkey-with-fallback');
    });

    it('should return passkey-only for user with passkeys when only passkeys enabled', () => {
      const userCheck = { hasWebAuthn: true };
      const config = {
        ...mockConfig,
        enablePasskeys: true,
        enableMagicLinks: false
      };

      const result = determineAuthMethod(userCheck, config, true);
      expect(result).toBe('passkey-only');
    });

    it('should return none when no authentication methods are enabled', () => {
      const userCheck = { hasWebAuthn: false };
      const config = {
        ...mockConfig,
        enablePasskeys: false,
        enableMagicLinks: false
      };

      const result = determineAuthMethod(userCheck, config, true);
      expect(result).toBe('none');
    });

    it('should return email-only when user has passkeys but WebAuthn not supported and magic links enabled', () => {
      const userCheck = { hasWebAuthn: true };
      const config = {
        ...mockConfig,
        enablePasskeys: true,
        enableMagicLinks: true
      };

      const result = determineAuthMethod(userCheck, config, false);
      expect(result).toBe('email-only');
    });
  });
});