<!--
  EmailInput - Granular email input component for authentication
  Features: validation, WebAuthn autocomplete, conditional authentication trigger
-->
<script lang="ts">
import { m } from '@thepia/flows-auth';
import { createEventDispatcher } from 'svelte';


  interface Props {
    // Props
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
  }

  let {
    value = $bindable(''),
    placeholder = '',
    disabled = false,
    required = true,
    error = null,
    label = '',
    showLabel = true,
    enableWebAuthn = true,
    debounceMs = 1000,
    className = ''
  }: Props = $props();

// Events
const dispatch = createEventDispatcher<{
  change: { value: string };
  conditionalAuth: { email: string };
  focus: { value: string };
  blur: { value: string };
}>();

// Internal state
let emailChangeTimeout: ReturnType<typeof setTimeout> | null = null;

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Handle input changes
function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  value = target.value;
  
  // Dispatch immediate change
  dispatch('change', { value });

  // Clear previous timeout
  if (emailChangeTimeout) {
    clearTimeout(emailChangeTimeout);
  }

  // Debounce conditional auth trigger
  if (enableWebAuthn && value.trim() && !disabled) {
    emailChangeTimeout = setTimeout(() => {
      if (isValidEmail(value)) {
        dispatch('conditionalAuth', { email: value });
      }
    }, debounceMs);
  }
}

function handleFocus(event: Event) {
  const target = event.target as HTMLInputElement;
  dispatch('focus', { value: target.value });
}

function handleBlur(event: Event) {
  const target = event.target as HTMLInputElement;
  dispatch('blur', { value: target.value });
}

function getInputClasses(): string {
  if (error) {
    return "input-brand error";
  }
  return "input-brand";
}


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
// Reactive values for i18n
let displayPlaceholder = $derived(getDisplayText(placeholder || 'email.placeholder'));
let displayLabel = $derived(getDisplayText(label || 'email.label'));
</script>

<div class="space-y-2 {className}">
  {#if showLabel}
    <label for="email-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {displayLabel}
    </label>
  {/if}
  
  <input
    id="email-input"
    type="email"
    class="w-full {getInputClasses()}"
    bind:value
    oninput={handleInput}
    onfocus={handleFocus}
    onblur={handleBlur}
    placeholder={displayPlaceholder}
    {disabled}
    {required}
    autocomplete={enableWebAuthn ? "email webauthn" : "email"}
  />
  
  {#if error}
    <div class="text-sm mt-1 text-semantic-error-600" role="alert">
      {error}
    </div>
  {/if}
</div>

<style>
  label {
    color: var(--color-text-secondary, #6b7280);
  }
</style>

