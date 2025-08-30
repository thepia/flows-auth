<!--
  AuthButton - State-aware authentication button component
  Features: loading states, different auth methods, customizable appearance
-->
<script lang="ts">
import { createEventDispatcher } from 'svelte';

// Props
export let type: 'submit' | 'button' = 'submit';
export let disabled = false;
export let loading = false;
export let variant: 'primary' | 'secondary' | 'ghost' = 'primary';
export let size: 'sm' | 'md' | 'lg' = 'md';
export let fullWidth = true;
export let className = '';

// Content props
export let text = '';
export let loadingText = '';
export let icon = '';
export let showIcon = true;

// Method-specific text and icons
export let method: 'passkey' | 'email' | 'magic-link' | 'generic' = 'generic';
export let supportsWebAuthn = false;

// Events
const dispatch = createEventDispatcher<{
  click: { method: string };
}>();

// Dynamic content based on method and state
$: displayText = getDisplayText();
$: displayIcon = getDisplayIcon();

function getDisplayText(): string {
  if (loading && loadingText) return loadingText;
  if (text) return text;
  
  // Default method-specific text
  if (loading) {
    switch (method) {
      case 'passkey': return 'Signing in...';
      case 'email': return 'Sending...';
      case 'magic-link': return 'Sending magic link...';
      default: return 'Loading...';
    }
  }
  
  switch (method) {
    case 'passkey': return supportsWebAuthn ? '🔑 Sign in with Passkey' : '🔑 Sign in';
    case 'email': return '✉️ Send Magic Link';
    case 'magic-link': return '✉️ Send Magic Link';
    default: return 'Continue';
  }
}

function getDisplayIcon(): string {
  if (loading) return '';
  if (icon) return icon;
  
  switch (method) {
    case 'passkey': return '🔑';
    case 'email': 
    case 'magic-link': return '✉️';
    default: return '';
  }
}

function handleClick(event: MouseEvent) {
  if (disabled || loading) {
    event.preventDefault();
    return;
  }
  
  dispatch('click', { method });
}
</script>

<button
  {type}
  class="auth-button variant-{variant} size-{size} {className}"
  class:full-width={fullWidth}
  class:loading
  class:disabled
  {disabled}
  on:click={handleClick}
>
  {#if loading}
    <span class="loading-spinner" aria-hidden="true"></span>
  {:else if showIcon && displayIcon}
    <span class="button-icon" aria-hidden="true">{displayIcon}</span>
  {/if}
  
  <span class="button-text">{displayText}</span>
</button>

<style>
  .auth-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: inherit;
    font-weight: 500;
    border: none;
    border-radius: var(--auth-border-radius, 8px);
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    box-sizing: border-box;
  }

  .auth-button:disabled,
  .auth-button.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .full-width {
    width: 100%;
  }

  /* Variants */
  .variant-primary {
    background: var(--auth-primary, var(--brand-primary, #0066cc));
    color: var(--auth-primary-text, #ffffff);
    border: 2px solid var(--auth-primary, var(--brand-primary, #0066cc));
  }

  .variant-primary:hover:not(:disabled):not(.disabled):not(.loading) {
    background: var(--auth-primary-hover, var(--brand-primary-hover, #0052a3));
    border-color: var(--auth-primary-hover, var(--brand-primary-hover, #0052a3));
    transform: translateY(-1px);
  }

  .variant-secondary {
    background: transparent;
    color: var(--auth-primary, var(--brand-primary, #0066cc));
    border: 2px solid var(--auth-primary, var(--brand-primary, #0066cc));
  }

  .variant-secondary:hover:not(:disabled):not(.disabled):not(.loading) {
    background: var(--auth-primary-light, rgba(0, 102, 204, 0.1));
  }

  .variant-ghost {
    background: transparent;
    color: var(--auth-text-secondary, #6b7280);
    border: 2px solid transparent;
  }

  .variant-ghost:hover:not(:disabled):not(.disabled):not(.loading) {
    background: var(--auth-surface-hover, #f3f4f6);
    color: var(--auth-text-primary, #374151);
  }

  /* Sizes */
  .size-sm {
    padding: 8px 16px;
    font-size: 14px;
    min-height: 36px;
  }

  .size-md {
    padding: 12px 16px;
    font-size: 16px;
    min-height: 48px;
  }

  .size-lg {
    padding: 14px 20px;
    font-size: 18px;
    min-height: 56px;
  }

  /* Loading state */
  .loading {
    position: relative;
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .button-icon {
    display: flex;
    align-items: center;
    font-size: 1.1em;
  }

  .button-text {
    flex: 1;
    text-align: center;
  }

  /* Disabled state styling */
  .auth-button:disabled,
  .auth-button.disabled {
    background: var(--auth-disabled-bg, #d1d5db) !important;
    color: var(--auth-disabled-text, #6b7280) !important;
    border-color: var(--auth-disabled-bg, #d1d5db) !important;
    transform: none !important;
  }
</style>