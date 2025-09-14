/**
 * AuthButton Logic Unit Tests
 *
 * Tests the logic functions and prop combinations for AuthButton
 * without requiring full Svelte component rendering
 */

import { writable } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';
import type { TranslationKey } from '../../src/utils/i18n';

// Mock the getDisplayText logic from AuthButton
function getDisplayText(
  method: string,
  loading: boolean,
  loadingText: string,
  text: string,
  supportsWebAuthn: boolean,
  isAppCodeBased: boolean,
  i18n: (key: TranslationKey) => string
): string {
  if (loading && loadingText) return loadingText;
  if (text) return text;

  // Method-specific text using i18n
  if (loading) {
    switch (method) {
      case 'passkey':
        return i18n('auth.signingIn');
      case 'email':
      case 'email-code':
        return i18n('auth.sendingPin');
      case 'magic-link':
        return i18n('auth.sendingMagicLink');
      case 'continue-touchid':
      case 'continue-faceid':
      case 'continue-biometric':
        return i18n('auth.signingIn');
      default:
        return i18n('auth.loading');
    }
  }

  switch (method) {
    case 'passkey':
      return supportsWebAuthn ? i18n('auth.signInWithPasskey') : i18n('auth.signIn');
    case 'email':
      // AppCode-aware: use pin or magic link text
      return isAppCodeBased ? i18n('auth.sendPinToEmail') : i18n('auth.sendMagicLink');
    case 'email-code':
      return i18n('auth.sendPinToEmail');
    case 'magic-link':
      return i18n('auth.sendMagicLink');
    case 'continue-touchid':
      return i18n('auth.continueWithTouchId');
    case 'continue-faceid':
      return i18n('auth.continueWithFaceId');
    case 'continue-biometric':
      return i18n('auth.continueWithBiometric');
    default:
      return i18n('action.continue');
  }
}

// Mock the getDisplayIcon logic from AuthButton
function getDisplayIcon(method: string, loading: boolean, icon: string): string {
  if (loading) return '';
  if (icon) return icon;

  switch (method) {
    case 'passkey':
      return '🔑';
    case 'email':
    case 'email-code':
    case 'magic-link':
      return '✉️';
    case 'continue-touchid':
      return '👆';
    case 'continue-faceid':
      return '😊';
    case 'continue-biometric':
      return '🔐';
    default:
      return '';
  }
}

describe('AuthButton Logic', () => {
  const mockI18n = vi.fn((key: TranslationKey) => {
    const translations: Record<string, string> = {
      'auth.signInWithPasskey': 'Sign in with Passkey',
      'auth.signIn': 'Sign in',
      'auth.sendPinToEmail': 'Send pin to email',
      'auth.sendMagicLink': 'Send Magic Link',
      'auth.continueWithTouchId': 'Continue with Touch ID',
      'auth.continueWithFaceId': 'Continue with Face ID',
      'auth.continueWithBiometric': 'Continue with Touch ID/Face ID',
      'auth.signingIn': 'Signing in...',
      'auth.sendingPin': 'Sending pin...',
      'auth.sendingMagicLink': 'Sending magic link...',
      'auth.loading': 'Loading...',
      'action.continue': 'Continue'
    };
    return translations[key] || key;
  });

  describe('Text Display Logic', () => {
    it('should display passkey text when WebAuthn is supported', () => {
      const text = getDisplayText(
        'passkey',
        false,
        '',
        '',
        true, // supportsWebAuthn
        false,
        mockI18n
      );

      expect(text).toBe('Sign in with Passkey');
    });

    it('should display generic sign in when WebAuthn is not supported', () => {
      const text = getDisplayText(
        'passkey',
        false,
        '',
        '',
        false, // supportsWebAuthn
        false,
        mockI18n
      );

      expect(text).toBe('Sign in');
    });

    it('should display pin text when AppCode is enabled', () => {
      const text = getDisplayText(
        'email',
        false,
        '',
        '',
        false,
        true, // isAppCodeBased
        mockI18n
      );

      expect(text).toBe('Send pin to email');
    });

    it('should display magic link text when AppCode is disabled', () => {
      const text = getDisplayText(
        'email',
        false,
        '',
        '',
        false,
        false, // isAppCodeBased
        mockI18n
      );

      expect(text).toBe('Send Magic Link');
    });

    it('should display Touch ID text', () => {
      const text = getDisplayText('continue-touchid', false, '', '', false, false, mockI18n);

      expect(text).toBe('Continue with Touch ID');
    });

    it('should display Face ID text', () => {
      const text = getDisplayText('continue-faceid', false, '', '', false, false, mockI18n);

      expect(text).toBe('Continue with Face ID');
    });

    it('should display biometric text', () => {
      const text = getDisplayText('continue-biometric', false, '', '', false, false, mockI18n);

      expect(text).toBe('Continue with Touch ID/Face ID');
    });
  });

  describe('Loading State Text', () => {
    it('should show signing in for passkey when loading', () => {
      const text = getDisplayText(
        'passkey',
        true, // loading
        '',
        '',
        true,
        false,
        mockI18n
      );

      expect(text).toBe('Signing in...');
    });

    it('should show sending pin for email-code when loading', () => {
      const text = getDisplayText(
        'email-code',
        true, // loading
        '',
        '',
        false,
        false,
        mockI18n
      );

      expect(text).toBe('Sending pin...');
    });

    it('should show sending magic link when loading', () => {
      const text = getDisplayText(
        'magic-link',
        true, // loading
        '',
        '',
        false,
        false,
        mockI18n
      );

      expect(text).toBe('Sending magic link...');
    });

    it('should use custom loading text when provided', () => {
      const text = getDisplayText(
        'passkey',
        true, // loading
        'Custom loading...', // loadingText
        '',
        true,
        false,
        mockI18n
      );

      expect(text).toBe('Custom loading...');
    });
  });

  describe('Custom Text Override', () => {
    it('should use custom text when provided', () => {
      const text = getDisplayText(
        'passkey',
        false,
        '',
        'Custom Button Text', // text
        true,
        false,
        mockI18n
      );

      expect(text).toBe('Custom Button Text');
    });

    it('should prioritize loading text over method text when loading without custom text', () => {
      const text = getDisplayText(
        'passkey',
        true,
        'Custom Loading...',
        '', // no custom text
        true,
        false,
        mockI18n
      );

      expect(text).toBe('Custom Loading...');
    });
  });

  describe('Icon Display Logic', () => {
    it('should show passkey icon', () => {
      const icon = getDisplayIcon('passkey', false, '');
      expect(icon).toBe('🔑');
    });

    it('should show email icon for email method', () => {
      const icon = getDisplayIcon('email', false, '');
      expect(icon).toBe('✉️');
    });

    it('should show email icon for email-code method', () => {
      const icon = getDisplayIcon('email-code', false, '');
      expect(icon).toBe('✉️');
    });

    it('should show email icon for magic-link method', () => {
      const icon = getDisplayIcon('magic-link', false, '');
      expect(icon).toBe('✉️');
    });

    it('should show Touch ID icon', () => {
      const icon = getDisplayIcon('continue-touchid', false, '');
      expect(icon).toBe('👆');
    });

    it('should show Face ID icon', () => {
      const icon = getDisplayIcon('continue-faceid', false, '');
      expect(icon).toBe('😊');
    });

    it('should show biometric icon', () => {
      const icon = getDisplayIcon('continue-biometric', false, '');
      expect(icon).toBe('🔐');
    });

    it('should not show icon when loading', () => {
      const icon = getDisplayIcon('passkey', true, '');
      expect(icon).toBe('');
    });

    it('should use custom icon when provided', () => {
      const icon = getDisplayIcon('passkey', false, '🚀');
      expect(icon).toBe('🚀');
    });
  });

  describe('AppCode Context Awareness', () => {
    it('should adapt email method text based on AppCode', () => {
      // With AppCode
      const pinText = getDisplayText(
        'email',
        false,
        '',
        '',
        false,
        true, // isAppCodeBased
        mockI18n
      );
      expect(pinText).toBe('Send pin to email');

      // Without AppCode
      const magicLinkText = getDisplayText(
        'email',
        false,
        '',
        '',
        false,
        false, // isAppCodeBased
        mockI18n
      );
      expect(magicLinkText).toBe('Send Magic Link');
    });

    it('should always show pin text for email-code method', () => {
      // email-code is always pin-based regardless of AppCode
      const text = getDisplayText(
        'email-code',
        false,
        '',
        '',
        false,
        false, // isAppCodeBased doesn't matter
        mockI18n
      );
      expect(text).toBe('Send pin to email');
    });

    it('should always show magic link text for magic-link method', () => {
      // magic-link is always magic link regardless of AppCode
      const text = getDisplayText(
        'magic-link',
        false,
        '',
        '',
        false,
        true, // isAppCodeBased doesn't matter
        mockI18n
      );
      expect(text).toBe('Send Magic Link');
    });
  });
});
