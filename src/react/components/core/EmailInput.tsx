/**
 * EmailInput - Granular email input component for authentication
 * Features: validation, WebAuthn autocomplete, conditional authentication trigger
 *
 * Ported from `src/svelte/components/core/EmailInput.svelte`. Controlled component
 * (React idiom) rather than Svelte's `bind:value` -- callers own `value` and pass
 * `onChange` to update it, matching how `SignInCore.tsx` drives this component.
 *
 * Note: the Svelte version styles its `<label>` with a bare `label { ... }` selector,
 * which Svelte's per-component scoping keeps local to this component. Plain CSS has no
 * such scoping, so the React port uses an explicit `.email-input-label` class instead
 * to avoid leaking a bare `label` rule onto a consumer's entire page.
 */
import type { ChangeEvent, FocusEvent } from 'react';
import { useEffect, useRef } from 'react';
import { m } from '../../../core/utils/i18n.js';
import './EmailInput.css';

export interface EmailInputProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  label?: string;
  showLabel?: boolean;
  enableWebAuthn?: boolean;
  debounceMs?: number;
  className?: string;
  onChange?: (payload: { value: string }) => void;
  onConditionalAuth?: (payload: { email: string }) => void;
  onFocus?: (payload: { value: string }) => void;
  onBlur?: (payload: { value: string }) => void;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function getDisplayText(key: string): string {
  try {
    const messageFunction = (m as unknown as Record<string, () => string>)[key];
    if (typeof messageFunction === 'function') {
      return messageFunction();
    }
    return key;
  } catch {
    console.warn(`Translation key "${key}" not found in Paraglide messages`);
    return key;
  }
}

export function EmailInput({
  value = '',
  placeholder = '',
  disabled = false,
  required = true,
  error = null,
  label = '',
  showLabel = true,
  enableWebAuthn = true,
  debounceMs = 1000,
  className = '',
  onChange,
  onConditionalAuth,
  onFocus,
  onBlur
}: EmailInputProps) {
  const emailChangeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (emailChangeTimeout.current) {
        clearTimeout(emailChangeTimeout.current);
      }
    };
  }, []);

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange?.({ value: newValue });

    if (emailChangeTimeout.current) {
      clearTimeout(emailChangeTimeout.current);
    }

    if (enableWebAuthn && newValue.trim() && !disabled) {
      emailChangeTimeout.current = setTimeout(() => {
        if (isValidEmail(newValue)) {
          onConditionalAuth?.({ email: newValue });
        }
      }, debounceMs);
    }
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    onFocus?.({ value: event.target.value });
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    onBlur?.({ value: event.target.value });
  };

  const inputClasses = error ? 'input-brand error' : 'input-brand';
  const displayPlaceholder = getDisplayText(placeholder || 'email.placeholder');
  const displayLabel = getDisplayText(label || 'email.label');

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <label htmlFor="email-input" className="email-input-label block text-sm font-medium text-gray-700">
          {displayLabel}
        </label>
      )}

      <input
        id="email-input"
        type="email"
        className={`w-full ${inputClasses}`}
        value={value}
        onChange={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={displayPlaceholder}
        disabled={disabled}
        required={required}
        autoComplete={enableWebAuthn ? 'email webauthn' : 'email'}
      />

      {error && (
        <div className="text-sm mt-1 text-semantic-error-600" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
