/**
 * AuthButton Component Unit Tests
 *
 * Comprehensive tests for the AuthButton component covering:
 * - Different authentication methods
 * - Paraglide i18n support (new)
 * - Legacy i18n support (backward compatibility)
 * - AppCode awareness
 * - Loading states
 * - Button variants and sizes
 * - Click events
 */

import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthButton from '../../src/components/core/AuthButton.svelte';

// No mocking of Paraglide functions - use real functions to test actual integration

describe('AuthButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Paraglide i18n Integration (Primary)', () => {
    it('should work with buttonConfig using Paraglide directly', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          buttonConfig: {
            method: 'passkey',
            textKey: 'auth.signInWithPasskey',
            loadingTextKey: 'auth.signingIn',
            supportsWebAuthn: true,
            disabled: false
          }
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('Continue with Touch ID/Face ID');
    });

    it('should call Paraglide message functions for different methods', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          buttonConfig: {
            method: 'email-code',
            textKey: 'auth.sendPinByEmail',
            loadingTextKey: 'auth.sendingPin',
            supportsWebAuthn: false,
            disabled: false
          }
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('Send pin to email');
    });

    it('should call Paraglide loading functions when loading', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          buttonConfig: {
            method: 'passkey',
            textKey: 'auth.signInWithPasskey',
            loadingTextKey: 'auth.signingIn',
            supportsWebAuthn: true,
            disabled: false
          },
          loading: true
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('Signing in...');
    });

    it('should use Paraglide for magic link method', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          buttonConfig: {
            method: 'magic-link',
            textKey: 'auth.sendMagicLink',
            loadingTextKey: 'auth.sendingMagicLink',
            supportsWebAuthn: false,
            disabled: false
          }
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('Send Magic Link');
    });
  });

  describe('Method-specific Text', () => {
    it('should display generic biometric text when method is passkey and WebAuthn is supported on Apple device', () => {
      // Test setup already mocks Mac user agent, so this should show generic biometric text
      const { getByRole } = render(AuthButton, {
        props: {
          buttonConfig: {
            method: 'passkey',
            textKey: 'auth.signInWithPasskey',
            loadingTextKey: 'auth.signingIn',
            supportsWebAuthn: true,
            disabled: false
          }
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('Continue with Touch ID/Face ID');
    });

    it('should display generic passkey text when method is passkey and WebAuthn is supported on non-Apple device', () => {
      // Mock non-Apple user agent
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        writable: true
      });

      const { getByRole } = render(AuthButton, {
        props: {
          buttonConfig: {
            method: 'passkey',
            textKey: 'auth.signInWithPasskey',
            loadingTextKey: 'auth.signingIn',
            supportsWebAuthn: true,
            disabled: false
          }
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('Sign in with Passkey');

      // Restore original user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true
      });
    });

    it('should display generic sign in text when method is passkey but WebAuthn is not supported', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          buttonConfig: {
            method: 'passkey',
            textKey: 'auth.signIn',
            loadingTextKey: 'auth.signingIn',
            supportsWebAuthn: false,
            disabled: false
          }
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('Sign in');
    });

    it('should display pin text when method is email and AppCode is enabled', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          buttonConfig: {
            method: 'email',
            textKey: 'auth.sendPinByEmail',
            loadingTextKey: 'auth.sendingPin',
            supportsWebAuthn: false,
            disabled: false
          },
          isAppCodeBased: true
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('Send pin to email');
    });

    it('should display magic link text when method is email and AppCode is disabled', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          buttonConfig: {
            method: 'email',
            textKey: 'auth.sendMagicLink',
            loadingTextKey: 'auth.sendingMagicLink',
            supportsWebAuthn: false,
            disabled: false
          },
          isAppCodeBased: false
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('Send Magic Link');
    });

    it('should display Touch ID text for continue-touchid method', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'continue-touchid'
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('Continue with Touch ID');
    });

    it('should display Face ID text for continue-faceid method', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'continue-faceid'
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('Continue with Face ID');
    });

    it('should display generic biometric text for continue-biometric method', () => {
      // All devices should show generic biometric text for better reliability
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'continue-biometric'
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('Continue with Touch ID/Face ID');
    });

    it('should display generic biometric text for continue-biometric method on non-Apple device', () => {
      // Mock non-Apple user agent
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        writable: true
      });

      const { getByRole } = render(AuthButton, {
        props: {
          method: 'continue-biometric'
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('Continue with Touch ID/Face ID');

      // Restore original user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading text and spinner when loading', () => {
      const { getByRole, container } = render(AuthButton, {
        props: {
          method: 'passkey',
          loading: true
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
          loading: true
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('Sending pin...');
    });

    it('should show magic link loading text when loading magic-link method', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'magic-link',
          loading: true
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
          loadingText: 'Custom loading...'
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
          method: 'passkey'
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
          showIcon: true
        }
      });

      const button = getByRole('button');
      expect(button.textContent).toContain('🚀');
    });

    it('should show method-specific icon when no custom icon provided', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'passkey',
          showIcon: true
        }
      });

      const button = getByRole('button');
      // On Apple devices (test setup mocks Mac), should show Touch ID icon
      expect(button.textContent).toContain('👆');
    });

    it('should hide icon when showIcon is false', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          method: 'passkey',
          showIcon: false
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
          variant: 'primary'
        }
      });

      const button = getByRole('button');
      expect(button.className).toContain('auth-btn-primary');
    });

    it('should apply secondary variant classes', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          variant: 'secondary'
        }
      });

      const button = getByRole('button');
      expect(button.className).toContain('auth-btn-secondary');
    });

    it('should apply ghost variant classes', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          variant: 'ghost'
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
          size: 'sm'
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
          size: 'md'
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
          size: 'lg'
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
          disabled: true
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
          loading: true
        }
      });

      const button = getByRole('button') as HTMLButtonElement;
      expect(button.className).toContain('cursor-not-allowed');
      expect(button.className).toContain('opacity-50');
    });

    it('should apply full width class when fullWidth is true', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          fullWidth: true
        }
      });

      const button = getByRole('button');
      expect(button.className).toContain('w-full');
    });

    it('should not apply full width class when fullWidth is false', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          fullWidth: false
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
          method: 'passkey'
        }
      });

      // Listen for the custom event using Svelte 4 pattern
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
          disabled: true
        }
      });

      // Listen for the custom event using Svelte 4 pattern
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
          loading: true
        }
      });

      // Listen for the custom event using Svelte 4 pattern
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
        props: {}
      });

      const button = getByRole('button') as HTMLButtonElement;
      expect(button.type).toBe('submit');
    });

    it('should use button type when specified', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          type: 'button'
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
          supportsWebAuthn: true
        }
      });

      const button = getByRole('button');
      // On Apple devices (test setup mocks Mac), should show generic biometric text
      expect(button.getAttribute('aria-label')).toBe('Continue with Touch ID/Face ID');
    });

    it('should use custom text as aria-label when provided', () => {
      const { getByRole } = render(AuthButton, {
        props: {
          text: 'Custom Action'
        }
      });

      const button = getByRole('button');
      expect(button.getAttribute('aria-label')).toBe('Custom Action');
    });
  });
});
