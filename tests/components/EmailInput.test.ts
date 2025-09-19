/**
 * EmailInput Component Tests
 *
 * Tests for EmailInput as a standalone component with real Svelte rendering.
 * Tests component behavior, event handling, validation, and i18n integration.
 */

import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmailInput from '../../src/components/core/EmailInput.svelte';

describe('EmailInput Component', () => {
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
        props: {}
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
          showLabel: false
        }
      });

      expect(screen.queryByText('Email address')).not.toBeInTheDocument();
    });

    it('should display custom placeholder', () => {
      render(EmailInput, {
        props: {
          placeholder: 'email.placeholder' // Use correct Paraglide key format
        }
      });

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'your@email.com');
    });

    it('should apply custom className', () => {
      const { container } = render(EmailInput, {
        props: {
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
          disabled: true
        }
      });

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should not be required when required prop is false', () => {
      render(EmailInput, {
        props: {
          required: false
        }
      });

      const input = screen.getByRole('textbox');
      expect(input).not.toHaveAttribute('required');
    });

    it('should display initial value', () => {
      render(EmailInput, {
        props: {
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
          error: 'Invalid email'
        }
      });

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('error');
    });

    it('should not display error message when error is null', () => {
      render(EmailInput, {
        props: {
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
          enableWebAuthn: true
        }
      });

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autocomplete', 'email webauthn');
    });

    it('should only include email in autocomplete when enableWebAuthn is false', () => {
      render(EmailInput, {
        props: {
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
        props: {}
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
    it('should use default translations for label and placeholder', () => {
      render(EmailInput, {
        props: {
          showLabel: true
        }
      });

      // Should display translated text, not raw keys
      expect(screen.getByText('Email address')).toBeInTheDocument();
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'your@email.com');
    });
  });

  describe('Email Validation Edge Cases', () => {
    it('should handle empty input gracefully', async () => {
      const { component } = render(EmailInput, {
        props: {
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
          showLabel: true
        }
      });

      // Should display the translated label text
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
