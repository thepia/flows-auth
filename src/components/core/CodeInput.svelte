<!--
  CodeInput - Dedicated input component for verification codes
  Features: numeric input optimization, proper formatting, validation

  Non-Controlled approach where the value remains internal.
-->
<script lang="ts">
import { createEventDispatcher } from 'svelte';
import { m } from '../../utils/i18n';
import { "code.label" as codeLabel } from '../../paraglide/messages';

// Internal state (non-controlled)
let value = '';

// Props
export let placeholder = '';
export let disabled = false;
export let required = true;
export let error: string | null = null;
export let label = '';
export let showLabel = true;
export let maxlength = 6;
export let className = '';
export let autoAdvance = false; // Auto-submit when code is complete
export let showDigits = false; // Show individual digit boxes instead of single input
export let autoFocus = false; // Auto-focus the input when component mounts

// Events
const dispatch = createEventDispatcher<{
  change: { value: string };
  focus: { value: string };
  blur: { value: string };
  complete: { value: string }; // Fired when code is complete (autoAdvance)
}>();

// Internal state for individual digits
let digits: string[] = Array(maxlength).fill('');
let inputRef: HTMLInputElement;
let digitRefs: HTMLInputElement[] = [];
let isUpdatingFromValue = false;

// Initialize digits array when maxlength changes
$: {
  if (showDigits && !isUpdatingFromValue) {
    const newDigits = Array(maxlength).fill('');
    // Update digits from current value
    if (value) {
      const chars = value.split('');
      for (let i = 0; i < maxlength; i++) {
        newDigits[i] = chars[i] || '';
      }
    }
    digits = newDigits;
  }
}

// Internal state for tracking current input length
let currentLength = 0;
let internalValue = '';

// Sync internal value with value prop for controlled mode
$: if (value !== internalValue && value !== undefined) {
  internalValue = value;
  currentLength = value.length;
}

// Handle input changes for single input mode
function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  // Only allow numeric input
  const numericValue = target.value.replace(/[^0-9]/g, '');

  // Update the target to show filtered value
  target.value = numericValue;

  // Update value (exported prop) and internal tracking
  value = numericValue;
  internalValue = numericValue;
  currentLength = numericValue.length;

  // Only dispatch change when code is valid (exact length)
  if (numericValue.length === maxlength) {
    dispatch('change', { value: numericValue });

    if (autoAdvance) {
      dispatch('complete', { value: numericValue });
    }
  }
}

// Handle digit input for individual digit mode
function handleDigitInput(event: Event, index: number) {
  const target = event.target as HTMLInputElement;
  const numericValue = target.value.replace(/[^0-9]/g, '');

  // Only take the last character if multiple were entered
  const digit = numericValue.slice(-1);

  isUpdatingFromValue = true;
  digits[index] = digit;
  digits = [...digits]; // Trigger reactivity
  value = digits.join('');
  isUpdatingFromValue = false;

  // Auto-advance to next input
  if (digit && index < maxlength - 1) {
    const nextInput = digitRefs[index + 1];
    if (nextInput) {
      nextInput.focus();
    }
  }

  // Dispatch events
  dispatch('change', { value });

  // Auto-complete when all digits are filled
  if (autoAdvance && value.length === maxlength) {
    dispatch('complete', { value });
  }
}

// Handle keydown for individual digits (backspace navigation)
function handleDigitKeyDown(event: KeyboardEvent, index: number) {
  if (event.key === 'Backspace' && !digits[index] && index > 0) {
    // Move to previous input if current is empty
    const prevInput = digitRefs[index - 1];
    if (prevInput) {
      prevInput.focus();
    }
  }
}

// Handle paste for both single and digit modes
function handlePaste(event: ClipboardEvent) {
  event.preventDefault();
  const pastedText = event.clipboardData?.getData('text') || '';
  const numericValue = pastedText.replace(/[^0-9]/g, '').slice(0, maxlength);

  isUpdatingFromValue = true;
  value = numericValue;

  if (showDigits) {
    // Update individual digits
    for (let i = 0; i < maxlength; i++) {
      digits[i] = numericValue[i] || '';
    }
    digits = [...digits];
  }
  isUpdatingFromValue = false;

  dispatch('change', { value: numericValue });

  if (autoAdvance && numericValue.length === maxlength) {
    dispatch('complete', { value: numericValue });
  }
}

function handleFocus(event: Event) {
  const target = event.target as HTMLInputElement;
  // Auto-select all text for easier replacement
  target.select();
  dispatch('focus', { value });
}

function handleBlur(event: Event) {
  const target = event.target as HTMLInputElement;
  dispatch('blur', { value });
}

function getInputClasses(): string {
  const baseClasses = "input-brand text-center text-lg font-mono tracking-widest";
  if (error) {
    return `${baseClasses} error`;
  }
  return baseClasses;
}

// Auto-focus functionality
function focusInput() {
  if (showDigits && digitRefs[0]) {
    digitRefs[0].focus();
  } else if (inputRef) {
    inputRef.focus();
  }
}

// Auto-focus on mount if enabled
$: if (autoFocus) {
  setTimeout(focusInput, 0); // Use setTimeout to ensure DOM is ready
}

// Reactive values for i18n
$: displayPlaceholder = getDisplayText(placeholder || 'code_placeholder');
$: displayLabel = getDisplayText(label || 'code_label');

// Helper function to get display text from Paraglide
function getDisplayText(key: string): string {
  try {
    const messageFunction = (m as unknown as {[key: string]: () => string})[key];
    if (typeof messageFunction === 'function') {
      return messageFunction();
    }
    // Fallback to key if function doesn't exist
    return key;
  } catch (error) {
    console.warn(`Translation key "${key}" not found in Paraglide messages`);
    return key;
  }
}
// Use existing translation keys for accessibility
$: ariaLabel = `${codeLabel()} (${maxlength} digits)`;
$: helpText = `Enter ${maxlength}-digit verification code`;
</script>

<div class="space-y-2 {className}">
  {#if showLabel}
  <label for={showDigits ? "digit-0" : "code-input"} class="block text-sm text-left font-medium text-gray-700 dark:text-gray-300">
      {displayLabel} ({currentLength}/{maxlength})
    </label>
  {/if}

  <!-- Accessibility helper text -->
  <div id="code-help" class="sr-only">
    {helpText}
  </div>

  {#if showDigits}
    <!-- Individual digit inputs -->
    <div class="flex gap-2 justify-center">
      {#each Array(maxlength) as _, i}
        <input
          bind:this={digitRefs[i]}
          id="digit-{i}"
          type="text"
          class="w-12 h-12 text-center text-lg font-mono border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {error ? 'border-red-500' : ''}"
          bind:value={digits[i]}
          on:input={(e) => handleDigitInput(e, i)}
          on:keydown={(e) => handleDigitKeyDown(e, i)}
          on:paste={handlePaste}
          maxlength="1"
          {disabled}
          {required}
          autocomplete="one-time-code"
          inputmode="numeric"
          pattern="[0-9]"
          aria-label="{ariaLabel} digit {i + 1}"
          aria-describedby="code-help"
        />
      {/each}
    </div>
  {:else}
    <!-- Single input mode -->
    <input
      bind:this={inputRef}
      id="code-input"
      type="text"
      class="w-full {getInputClasses()}"
      value={value}
      on:input={handleInput}
      on:focus={handleFocus}
      on:blur={handleBlur}
      on:paste={handlePaste}
      placeholder={displayPlaceholder}
      {disabled}
      {required}
      {maxlength}
      autocomplete="one-time-code"
      inputmode="numeric"
      pattern="[0-9]*"
      aria-label={ariaLabel}
      aria-describedby="code-help"
    />
  {/if}

  {#if error}
    <div class="text-sm mt-1 text-semantic-error-600" role="alert">
      {error}
    </div>
  {/if}
</div>

<style>
  label {
    color: var(--color-text-secondary);
  }

  /* Screen reader only content */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Individual digit input styling */
  .digit-input {
    transition: all 0.15s ease;
  }

  .digit-input:focus {
    transform: scale(1.05);
  }
</style>