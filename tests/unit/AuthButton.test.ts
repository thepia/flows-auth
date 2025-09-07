/**
 * AuthButton Component Unit Tests
 * 
 * Comprehensive tests for the AuthButton component covering:
 * - Different authentication methods
 * - i18n support
 * - AppCode awareness
 * - Loading states
 * - Button variants and sizes
 * - Click events
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import AuthButton from '../../src/components/core/AuthButton.svelte';
import type { TranslationKey } from '../../src/utils/i18n';

describe('AuthButton Component', () => {
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

  const i18nStore = writable(mockI18n);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Method-specific Text', () => {
    it('should display passkey text when method is passkey and WebAuthn is supported', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'passkey',
          supportsWebAuthn: true,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).toContain('Sign in with Passkey');
    });

    it('should display generic sign in text when method is passkey but WebAuthn is not supported', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'passkey',
          supportsWebAuthn: false,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).toContain('Sign in');
    });

    it('should display pin text when method is email and AppCode is enabled', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'email',
          isAppCodeBased: true,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).toContain('Send pin to email');
    });

    it('should display magic link text when method is email and AppCode is disabled', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'email',
          isAppCodeBased: false,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).toContain('Send Magic Link');
    });

    it('should display Touch ID text for continue-touchid method', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'continue-touchid',
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).toContain('Continue with Touch ID');
    });

    it('should display Face ID text for continue-faceid method', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'continue-faceid',
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).toContain('Continue with Face ID');
    });

    it('should display biometric text for continue-biometric method', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'continue-biometric',
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).toContain('Continue with Touch ID/Face ID');
    });
  });

  describe('Loading States', () => {
    it('should show loading text and spinner when loading', () => {
      const { getByRole, container } = render(AuthButton, {
        props: {
          method: 'passkey',
          loading: true,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).toContain('Signing in...');
      
      // Check for spinner
      const spinner = container.querySelector('.spinner');
      expect(spinner).toBeTruthy();
    });

    it('should show pin loading text when loading email-code method', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'email-code',
          loading: true,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).toContain('Sending pin...');
    });

    it('should show magic link loading text when loading magic-link method', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'magic-link',
          loading: true,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).toContain('Sending magic link...');
    });

    it('should use custom loading text when provided', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'passkey',
          loading: true,
          loadingText: 'Custom loading...',
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).toContain('Custom loading...');
    });
  });

  describe('Custom Text and Icons', () => {
    it('should use custom text when provided', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          text: 'Custom Button Text',
          method: 'passkey',
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).toContain('Custom Button Text');
    });

    it('should use custom icon when provided', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          icon: '🚀',
          method: 'passkey',
          showIcon: true,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).toContain('🚀');
    });

    it('should show method-specific icon when no custom icon provided', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'passkey',
          showIcon: true,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).toContain('🔑');
    });

    it('should hide icon when showIcon is false', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'passkey',
          showIcon: false,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.textContent).not.toContain('🔑');
    });
  });

  describe('Button Variants', () => {
    it('should apply primary variant classes', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          variant: 'primary',
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.className).toContain('auth-btn-primary');
    });

    it('should apply secondary variant classes', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          variant: 'secondary',
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.className).toContain('auth-btn-secondary');
    });

    it('should apply ghost variant classes', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          variant: 'ghost',
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.className).toContain('auth-btn-ghost');
    });
  });

  describe('Button Sizes', () => {
    it('should apply small size classes', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          size: 'sm',
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.className).toContain('px-3');
      expect(button.className).toContain('py-1.5');
      expect(button.className).toContain('text-sm');
    });

    it('should apply medium size classes', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          size: 'md',
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('py-2');
      expect(button.className).toContain('text-base');
    });

    it('should apply large size classes', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          size: 'lg',
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.className).toContain('px-5');
      expect(button.className).toContain('py-3');
      expect(button.className).toContain('text-lg');
    });
  });

  describe('Button State', () => {
    it('should be disabled when disabled prop is true', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          disabled: true,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.className).toContain('cursor-not-allowed');
      expect(button.className).toContain('opacity-50');
    });

    it('should be disabled when loading', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          loading: true,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button') as HTMLButtonElement;
      expect(button.className).toContain('cursor-not-allowed');
      expect(button.className).toContain('opacity-50');
    });

    it('should apply full width class when fullWidth is true', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          fullWidth: true,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.className).toContain('w-full');
    });

    it('should not apply full width class when fullWidth is false', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          fullWidth: false,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.className).not.toContain('w-full');
    });
  });

  describe('Click Events', () => {
    it('should dispatch click event with method', async () => {
      const handleClick = vi.fn();
      
      const { getByRole, component } = render(AuthButton, {
        props: {
          method: 'passkey',
          i18n: i18nStore
        }
      });
      
      component.$on('click', handleClick);
      
      const button = getByRole('button');
      await fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { method: 'passkey' }
        })
      );
    });

    it('should not dispatch click event when disabled', async () => {
      const handleClick = vi.fn();
      
      const { getByRole, component } = render(AuthButton, {
        props: {
          method: 'passkey',
          disabled: true,
          i18n: i18nStore
        }
      });
      
      component.$on('click', handleClick);
      
      const button = getByRole('button');
      await fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not dispatch click event when loading', async () => {
      const handleClick = vi.fn();
      
      const { getByRole, component } = render(AuthButton, {
        props: {
          method: 'passkey',
          loading: true,
          i18n: i18nStore
        }
      });
      
      component.$on('click', handleClick);
      
      const button = getByRole('button');
      await fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('i18n Required', () => {
    it('should require i18n prop', () => {
      // AuthButton requires i18n - attempting to render without it should fail
      expect(() => {
        render(AuthButton, {
          props: {
            method: 'passkey',
            supportsWebAuthn: true
            // Missing required i18n prop
          }
        });
      }).toThrow();
    });
  });

  describe('Button Type', () => {
    it('should default to submit type', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button') as HTMLButtonElement;
      expect(button.type).toBe('submit');
    });

    it('should use button type when specified', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          type: 'button',
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button') as HTMLButtonElement;
      expect(button.type).toBe('button');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'passkey',
          supportsWebAuthn: true,
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.getAttribute('aria-label')).toBe('Sign in with Passkey');
    });

    it('should use custom text as aria-label when provided', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          text: 'Custom Action',
          i18n: i18nStore
        }
      });
      
      const button = getByRole('button');
      expect(button.getAttribute('aria-label')).toBe('Custom Action');
    });
  });
});