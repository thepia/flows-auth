<!--
  EmailInput - Granular email input component for authentication
  Features: validation, WebAuthn autocomplete, conditional authentication trigger
-->
<script lang="ts">
import { createEventDispatcher } from 'svelte';

// Props
export let value = '';
export let placeholder = 'your.email@company.com';
export let disabled = false;
export let required = true;
export let error: string | null = null;
export let label = 'Email address';
export let showLabel = true;
export let enableWebAuthn = true;
export let debounceMs = 1000;
export let className = '';

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
</script>

<div class="email-input-group {className}">
  {#if showLabel}
    <label for="email-input" class="input-label">
      {label}
    </label>
  {/if}
  
  <input
    id="email-input"
    type="email"
    class="email-input"
    class:error={!!error}
    bind:value
    on:input={handleInput}
    on:focus={handleFocus}
    on:blur={handleBlur}
    {placeholder}
    {disabled}
    {required}
    autocomplete={enableWebAuthn ? "email webauthn" : "email"}
  />
  
  {#if error}
    <div class="error-message" role="alert">
      {error}
    </div>
  {/if}
</div>

<style>
  .email-input-group {
    width: 100%;
  }

  .input-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--auth-text-secondary, #374151);
    margin-bottom: 8px;
  }

  .email-input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid var(--auth-border, #d1d5db);
    border-radius: var(--auth-border-radius, 8px);
    font-size: 16px;
    font-family: inherit;
    background: var(--auth-input-bg, #ffffff);
    color: var(--auth-text-primary, #111827);
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }

  .email-input:focus {
    outline: none;
    border-color: var(--auth-primary, var(--brand-primary, #0066cc));
    box-shadow: 0 0 0 3px var(--auth-primary-light, rgba(0, 102, 204, 0.1));
  }

  .email-input:disabled {
    background: var(--auth-input-disabled-bg, #f9fafb);
    color: var(--auth-text-disabled, #6b7280);
    cursor: not-allowed;
  }

  .email-input.error {
    border-color: var(--auth-error, #ef4444);
  }

  .error-message {
    color: var(--auth-error, #ef4444);
    font-size: 14px;
    margin-top: 4px;
    font-weight: 500;
  }
</style>