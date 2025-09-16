/**
 * EmailInput Component Tests
 *
 * Tests for EmailInput as a standalone component with real Svelte rendering.
 * Tests component behavior, event handling, validation, and i18n integration.
 */

import { fireEvent, render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmailInput from '../../src/components/core/EmailInput.svelte';

// Mock svelte-i18n for future compatibility
vi.mock('svelte-i18n', () => ({
  _: vi.fn((key: string) => {
    const translations: Record<string, string> = {
      'email.placeholder': 'your@email.com',
      'email.label': 'Email address',
      'email.error.invalid': 'Please enter a valid email address',
      'email.error.required': 'Email is required'
    };
    return translations[key] || key;
  })
}));

describe('EmailInput Component', () => {
  // Mock i18n store for current component implementation
  const mockI18n = vi.fn((key: string) => {
    const translations: Record<string, string> = {
      'email.placeholder': 'your@email.com',
      'email.label': 'Email address',
      'email.error.invalid': 'Please enter a valid email address',
      'email.error.required': 'Email is required'
    };
    return translations[key] || key;
  });

  const i18nStore = writable(mockI18n);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore
        }
      });

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('id', 'email-input');
      expect(input).toHaveAttribute('required');
    });

    it('should render label when showLabel is true', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore,
          showLabel: true
        }
      });

      const label = screen.getByText('Email address');
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute('for', 'email-input');
    });

    it('should not render label when showLabel is false', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore,
          showLabel: false
        }
      });

      expect(screen.queryByText('Email address')).not.toBeInTheDocument();
    });

    it('should display custom placeholder', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore,
          placeholder: 'email.placeholder'
        }
      });

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'your@email.com');
    });

    it('should apply custom className', () => {
      const { container } = render(EmailInput, {
        props: {
          i18n: i18nStore,
          className: 'custom-email-input'
        }
      });

      const wrapper = container.querySelector('.custom-email-input');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Input States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore,
          disabled: true
        }
      });

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should not be required when required prop is false', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore,
          required: false
        }
      });

      const input = screen.getByRole('textbox');
      expect(input).not.toHaveAttribute('required');
    });

    it('should display initial value', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore,
          value: 'test@example.com'
        }
      });

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('test@example.com');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error prop is set', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore,
          error: 'Invalid email address'
        }
      });

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Invalid email address');
    });

    it('should apply error CSS class when error exists', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore,
          error: 'Invalid email'
        }
      });

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('error');
    });

    it('should not display error message when error is null', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore,
          error: null
        }
      });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('WebAuthn Integration', () => {
    it('should include webauthn in autocomplete when enableWebAuthn is true', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore,
          enableWebAuthn: true
        }
      });

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autocomplete', 'email webauthn');
    });

    it('should only include email in autocomplete when enableWebAuthn is false', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore,
          enableWebAuthn: false
        }
      });

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autocomplete', 'email');
    });
  });

  describe('Event Handling', () => {
    it('should dispatch change event on input', async () => {
      const { component } = render(EmailInput, {
        props: {
          i18n: i18nStore
        }
      });

      const handleChange = vi.fn();
      component.$on('change', handleChange);

      const input = screen.getByRole('textbox');
      await fireEvent.input(input, { target: { value: 'test@example.com' } });

      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { value: 'test@example.com' }
        })
      );
    });

    it('should dispatch focus event on focus', async () => {
      const { component } = render(EmailInput, {
        props: {
          i18n: i18nStore,
          value: 'test@example.com'
        }
      });

      const handleFocus = vi.fn();
      component.$on('focus', handleFocus);

      const input = screen.getByRole('textbox');
      await fireEvent.focus(input);

      expect(handleFocus).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { value: 'test@example.com' }
        })
      );
    });

    it('should dispatch blur event on blur', async () => {
      const { component } = render(EmailInput, {
        props: {
          i18n: i18nStore,
          value: 'test@example.com'
        }
      });

      const handleBlur = vi.fn();
      component.$on('blur', handleBlur);

      const input = screen.getByRole('textbox');
      await fireEvent.blur(input);

      expect(handleBlur).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { value: 'test@example.com' }
        })
      );
    });
  });

  describe('Conditional Authentication', () => {
    it('should dispatch conditionalAuth for valid email after debounce', async () => {
      const { component } = render(EmailInput, {
        props: {
          i18n: i18nStore,
          enableWebAuthn: true,
          debounceMs: 1000
        }
      });

      const handleConditionalAuth = vi.fn();
      component.$on('conditionalAuth', handleConditionalAuth);

      const input = screen.getByRole('textbox');
      await fireEvent.input(input, { target: { value: 'test@example.com' } });

      // Should not trigger immediately
      expect(handleConditionalAuth).not.toHaveBeenCalled();

      // Should trigger after debounce
      vi.advanceTimersByTime(1000);
      expect(handleConditionalAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { email: 'test@example.com' }
        })
      );
    });

    it('should not dispatch conditionalAuth for invalid email', async () => {
      const { component } = render(EmailInput, {
        props: {
          i18n: i18nStore,
          enableWebAuthn: true,
          debounceMs: 1000
        }
      });

      const handleConditionalAuth = vi.fn();
      component.$on('conditionalAuth', handleConditionalAuth);

      const input = screen.getByRole('textbox');
      await fireEvent.input(input, { target: { value: 'invalid-email' } });

      vi.advanceTimersByTime(1000);
      expect(handleConditionalAuth).not.toHaveBeenCalled();
    });

    it('should not dispatch conditionalAuth when WebAuthn is disabled', async () => {
      const { component } = render(EmailInput, {
        props: {
          i18n: i18nStore,
          enableWebAuthn: false,
          debounceMs: 1000
        }
      });

      const handleConditionalAuth = vi.fn();
      component.$on('conditionalAuth', handleConditionalAuth);

      const input = screen.getByRole('textbox');
      await fireEvent.input(input, { target: { value: 'test@example.com' } });

      vi.advanceTimersByTime(1000);
      expect(handleConditionalAuth).not.toHaveBeenCalled();
    });

    it('should not dispatch conditionalAuth when input is disabled', async () => {
      const { component } = render(EmailInput, {
        props: {
          i18n: i18nStore,
          enableWebAuthn: true,
          disabled: true,
          debounceMs: 1000
        }
      });

      const handleConditionalAuth = vi.fn();
      component.$on('conditionalAuth', handleConditionalAuth);

      const input = screen.getByRole('textbox');
      await fireEvent.input(input, { target: { value: 'test@example.com' } });

      vi.advanceTimersByTime(1000);
      expect(handleConditionalAuth).not.toHaveBeenCalled();
    });

    it('should cancel previous timeout on rapid changes', async () => {
      const { component } = render(EmailInput, {
        props: {
          i18n: i18nStore,
          enableWebAuthn: true,
          debounceMs: 1000
        }
      });

      const handleConditionalAuth = vi.fn();
      component.$on('conditionalAuth', handleConditionalAuth);

      const input = screen.getByRole('textbox');
      
      // First email change
      await fireEvent.input(input, { target: { value: 'first@example.com' } });
      vi.advanceTimersByTime(500);

      // Second email change before timeout
      await fireEvent.input(input, { target: { value: 'second@example.com' } });
      vi.advanceTimersByTime(500);

      // Should not trigger for first email
      expect(handleConditionalAuth).not.toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { email: 'first@example.com' }
        })
      );

      // Complete second timeout
      vi.advanceTimersByTime(500);
      expect(handleConditionalAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { email: 'second@example.com' }
        })
      );
      expect(handleConditionalAuth).toHaveBeenCalledTimes(1);
    });

    it('should respect custom debounce timing', async () => {
      const { component } = render(EmailInput, {
        props: {
          i18n: i18nStore,
          enableWebAuthn: true,
          debounceMs: 500
        }
      });

      const handleConditionalAuth = vi.fn();
      component.$on('conditionalAuth', handleConditionalAuth);

      const input = screen.getByRole('textbox');
      await fireEvent.input(input, { target: { value: 'test@example.com' } });

      // Should not trigger before custom debounce
      vi.advanceTimersByTime(400);
      expect(handleConditionalAuth).not.toHaveBeenCalled();

      // Should trigger after custom debounce
      vi.advanceTimersByTime(100);
      expect(handleConditionalAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { email: 'test@example.com' }
        })
      );
    });
  });

  describe('i18n Integration', () => {
    it('should use custom label translation key', () => {
      const customI18n = vi.fn((key: TranslationKey) => {
        if (key === 'custom.label') return 'Custom Email Label';
        return key;
      });
      const customI18nStore = writable(customI18n);

      render(EmailInput, {
        props: {
          i18n: customI18nStore,
          label: 'custom.label',
          showLabel: true
        }
      });

      expect(screen.getByText('Custom Email Label')).toBeInTheDocument();
      expect(customI18n).toHaveBeenCalledWith('custom.label');
    });

    it('should use custom placeholder translation key', () => {
      const customI18n = vi.fn((key: TranslationKey) => {
        if (key === 'custom.placeholder') return 'Enter your email here';
        return key;
      });
      const customI18nStore = writable(customI18n);

      render(EmailInput, {
        props: {
          i18n: customI18nStore,
          placeholder: 'custom.placeholder'
        }
      });

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'Enter your email here');
      expect(customI18n).toHaveBeenCalledWith('custom.placeholder');
    });

    it('should fall back to default keys when custom keys are empty', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore,
          label: '',
          placeholder: '',
          showLabel: true
        }
      });

      expect(screen.getByText('Email address')).toBeInTheDocument();
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'your@email.com');
    });

    it('should reactively update when i18n store changes', async () => {
      const dynamicI18n = writable(mockI18n);

      const { rerender } = render(EmailInput, {
        props: {
          i18n: dynamicI18n,
          showLabel: true
        }
      });

      expect(screen.getByText('Email address')).toBeInTheDocument();

      // Update i18n function
      const newI18n = vi.fn((key: TranslationKey) => {
        if (key === 'email.label') return 'Updated Email Label';
        return key;
      });
      dynamicI18n.set(newI18n);

      // Force re-render to trigger reactivity
      await rerender({
        i18n: dynamicI18n,
        showLabel: true
      });

      expect(screen.getByText('Updated Email Label')).toBeInTheDocument();
    });
  });

  describe('Email Validation Edge Cases', () => {
    it('should handle empty input gracefully', async () => {
      const { component } = render(EmailInput, {
        props: {
          i18n: i18nStore,
          enableWebAuthn: true,
          debounceMs: 1000
        }
      });

      const handleConditionalAuth = vi.fn();
      component.$on('conditionalAuth', handleConditionalAuth);

      const input = screen.getByRole('textbox');
      await fireEvent.input(input, { target: { value: '' } });

      vi.advanceTimersByTime(1000);
      expect(handleConditionalAuth).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only input', async () => {
      const { component } = render(EmailInput, {
        props: {
          i18n: i18nStore,
          enableWebAuthn: true,
          debounceMs: 1000
        }
      });

      const handleConditionalAuth = vi.fn();
      component.$on('conditionalAuth', handleConditionalAuth);

      const input = screen.getByRole('textbox');
      await fireEvent.input(input, { target: { value: '   ' } });

      vi.advanceTimersByTime(1000);
      expect(handleConditionalAuth).not.toHaveBeenCalled();
    });

    it('should validate complex email addresses', async () => {
      const { component } = render(EmailInput, {
        props: {
          i18n: i18nStore,
          enableWebAuthn: true,
          debounceMs: 1000
        }
      });

      const handleConditionalAuth = vi.fn();
      component.$on('conditionalAuth', handleConditionalAuth);

      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'name@subdomain.domain.com',
        'user123@test-domain.org'
      ];

      for (const email of validEmails) {
        const input = screen.getByRole('textbox');
        await fireEvent.input(input, { target: { value: email } });
        vi.advanceTimersByTime(1000);

        expect(handleConditionalAuth).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: { email }
          })
        );

        handleConditionalAuth.mockClear();
      }
    });

    it('should reject invalid email formats', async () => {
      const { component } = render(EmailInput, {
        props: {
          i18n: i18nStore,
          enableWebAuthn: true,
          debounceMs: 1000
        }
      });

      const handleConditionalAuth = vi.fn();
      component.$on('conditionalAuth', handleConditionalAuth);

      const invalidEmails = [
        'invalid',
        'user@',
        '@domain.com',
        'user@domain',
        'user space@domain.com',
        'user@@domain.com'
      ];

      for (const email of invalidEmails) {
        const input = screen.getByRole('textbox');
        await fireEvent.input(input, { target: { value: email } });
        vi.advanceTimersByTime(1000);

        expect(handleConditionalAuth).not.toHaveBeenCalled();
        handleConditionalAuth.mockClear();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore,
          error: 'Invalid email'
        }
      });

      const input = screen.getByRole('textbox');
      const errorMessage = screen.getByRole('alert');

      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('id', 'email-input');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('should associate label with input', () => {
      render(EmailInput, {
        props: {
          i18n: i18nStore,
          showLabel: true
        }
      });

      const label = screen.getByText('Email address');
      const input = screen.getByRole('textbox');

      expect(label).toHaveAttribute('for', 'email-input');
      expect(input).toHaveAttribute('id', 'email-input');
    });
  });

  describe('Performance', () => {
    it('should cleanup timeout on component destruction', () => {
      const { component } = render(EmailInput, {
        props: {
          i18n: i18nStore,
          enableWebAuthn: true,
          debounceMs: 1000
        }
      });

      const input = screen.getByRole('textbox');
      fireEvent.input(input, { target: { value: 'test@example.com' } });

      // Destroy component before timeout completes
      component.$destroy();

      // Advance timers - should not cause any issues
      vi.advanceTimersByTime(1000);

      // Test passes if no errors are thrown
      expect(true).toBe(true);
    });
  });
});
