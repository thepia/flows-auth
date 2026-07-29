/**
 * CodeInput - Dedicated input component for verification codes
 * Features: numeric input optimization, proper formatting, validation
 *
 * Non-controlled approach where the value remains internal (ported from
 * `src/svelte/components/core/CodeInput.svelte`, matching its own doc comment).
 */
import type { ChangeEvent, ClipboardEvent, FocusEvent, KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { m } from '../../../core/utils/i18n.js';
import './CodeInput.css';

export interface CodeInputProps {
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  label?: string;
  showLabel?: boolean;
  maxlength?: number;
  className?: string;
  /** Auto-submit when code is complete */
  autoAdvance?: boolean;
  /** Show individual digit boxes instead of single input */
  showDigits?: boolean;
  /** Auto-focus the input when component mounts */
  autoFocus?: boolean;
  onChange?: (payload: { value: string }) => void;
  onFocusChange?: (payload: { value: string }) => void;
  onBlurChange?: (payload: { value: string }) => void;
  /** Fired when code is complete (autoAdvance) */
  onComplete?: (payload: { value: string }) => void;
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

export function CodeInput({
  placeholder = '',
  disabled = false,
  required = true,
  error = null,
  label = '',
  showLabel = true,
  maxlength = 6,
  className = '',
  autoAdvance = false,
  showDigits = false,
  autoFocus = false,
  onChange,
  onFocusChange,
  onBlurChange,
  onComplete
}: CodeInputProps) {
  const [value, setValue] = useState('');
  const [digits, setDigits] = useState<string[]>(() => Array(maxlength).fill(''));
  const inputRef = useRef<HTMLInputElement | null>(null);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Stable per-slot keys, independent of digit position/value, so re-renders
  // don't key digit boxes off their array index (see CodeInput port notes).
  const digitKeys = useMemo(
    () => Array.from({ length: maxlength }, () => Math.random().toString(36).slice(2)),
    [maxlength]
  );

  useEffect(() => {
    setDigits(Array(maxlength).fill(''));
  }, [maxlength]);

  useEffect(() => {
    if (!autoFocus) return undefined;
    const timeout = setTimeout(() => {
      if (showDigits && digitRefs.current[0]) {
        digitRefs.current[0].focus();
      } else {
        inputRef.current?.focus();
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [autoFocus, showDigits]);

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const numericValue = event.target.value.replace(/[^0-9]/g, '');
    setValue(numericValue);

    if (numericValue.length === maxlength) {
      onChange?.({ value: numericValue });
      if (autoAdvance) {
        onComplete?.({ value: numericValue });
      }
    }
  };

  const handleDigitInput = (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const numericValue = event.target.value.replace(/[^0-9]/g, '');
    const digit = numericValue.slice(-1);

    const nextDigits = [...digits];
    nextDigits[index] = digit;
    setDigits(nextDigits);
    const nextValue = nextDigits.join('');
    setValue(nextValue);

    if (digit && index < maxlength - 1) {
      digitRefs.current[index + 1]?.focus();
    }

    onChange?.({ value: nextValue });

    if (autoAdvance && nextValue.length === maxlength) {
      onComplete?.({ value: nextValue });
    }
  };

  const handleDigitKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    const numericValue = pastedText.replace(/[^0-9]/g, '').slice(0, maxlength);

    setValue(numericValue);

    if (showDigits) {
      const nextDigits = Array(maxlength).fill('');
      for (let i = 0; i < maxlength; i++) {
        nextDigits[i] = numericValue[i] || '';
      }
      setDigits(nextDigits);
    }

    onChange?.({ value: numericValue });

    if (autoAdvance && numericValue.length === maxlength) {
      onComplete?.({ value: numericValue });
    }
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    // Auto-select all text for easier replacement.
    event.target.select();
    onFocusChange?.({ value });
  };

  const handleBlur = () => {
    onBlurChange?.({ value });
  };

  const inputClasses = `input-brand text-center text-lg font-mono tracking-widest${error ? ' error' : ''}`;
  const displayPlaceholder = getDisplayText(placeholder || 'code_placeholder');
  const displayLabel = getDisplayText(label || 'code_label');
  const ariaLabel = `${m['code.label']()} (${maxlength} digits)`;
  const helpText = `Enter ${maxlength}-digit verification code`;

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <label
          htmlFor={showDigits ? 'digit-0' : 'code-input'}
          className="code-input-label block text-sm text-left font-medium text-gray-700"
        >
          {displayLabel} ({value.length}/{maxlength})
        </label>
      )}

      <div id="code-help" className="sr-only">
        {helpText}
      </div>

      {showDigits ? (
        <div className="flex gap-2 justify-center">
          {digitKeys.map((key, i) => (
            <input
              key={key}
              ref={(el) => {
                digitRefs.current[i] = el;
              }}
              id={`digit-${i}`}
              type="text"
              className={`digit-input${error ? ' error' : ''}`}
              value={digits[i] ?? ''}
              onChange={(e) => handleDigitInput(e, i)}
              onKeyDown={(e) => handleDigitKeyDown(e, i)}
              onPaste={handlePaste}
              maxLength={1}
              disabled={disabled}
              required={required}
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]"
              aria-label={`${ariaLabel} digit ${i + 1}`}
              aria-describedby="code-help"
            />
          ))}
        </div>
      ) : (
        <input
          ref={inputRef}
          id="code-input"
          type="text"
          className={`w-full ${inputClasses}`}
          value={value}
          onChange={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPaste={handlePaste}
          placeholder={displayPlaceholder}
          disabled={disabled}
          required={required}
          maxLength={maxlength}
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={ariaLabel}
          aria-describedby="code-help"
        />
      )}

      {error && (
        <div className="text-sm mt-1 text-semantic-error-600" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
