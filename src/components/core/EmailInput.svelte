<!--
  EmailInput - Granular email input component for authentication
  Features: validation, WebAuthn autocomplete, conditional authentication trigger
-->
<script lang="ts">
import { createEventDispatcher } from 'svelte';
import type { Readable } from 'svelte/store';
import type { TranslationKey } from '../../utils/i18n';

// Props
export let value = '';
export let placeholder: TranslationKey | '' = '';
export let disabled = false;
export let required = true;
export let error: string | null = null;
export let label: TranslationKey | '' = '';
export let showLabel = true;
export let enableWebAuthn = true;
export let debounceMs = 1000;
export let className = '';
export let i18n: Readable<(key: TranslationKey, variables?: Record<string, any>) => string>;

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

// Reactive values for i18n
$: displayPlaceholder = $i18n(placeholder || 'email.placeholder');
$: displayLabel = $i18n(label || 'email.label');
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
    on:input={handleInput}
    on:focus={handleFocus}
    on:blur={handleBlur}
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
    color: var(--color-text-secondary);
  }
</style>

