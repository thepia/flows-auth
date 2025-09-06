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
      case 'email': return 'Sending pin...';
      case 'email-code': return 'Sending pin...';
      case 'magic-link': return 'Sending magic link...';
      default: return 'Loading...';
    }
  }
  
  switch (method) {
    case 'passkey': return supportsWebAuthn ? 'Sign in with Passkey' : 'Sign in';
    case 'email': return 'Send pin by email';
    case 'email-code': return 'Send pin by email';
    case 'magic-link': return 'Send Magic Link';
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

function getButtonClasses(): string {
  // Base Tailwind utility classes for layout, custom CSS classes for styling
  const baseClasses = "flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[2.75rem]";
  
  let variantClasses = "";
  if (variant === 'primary') {
    variantClasses = "auth-btn-primary";
  } else if (variant === 'secondary') {
    variantClasses = "auth-btn-secondary";
  } else {
    variantClasses = "auth-btn-ghost";
  }
  
  let sizeClasses = "";
  if (size === 'sm') {
    sizeClasses = "px-3 py-1.5 text-sm";
  } else if (size === 'lg') {
    sizeClasses = "px-5 py-3 text-lg";
  } else {
    sizeClasses = "px-4 py-2 text-base";
  }
  
  const widthClass = fullWidth ? "w-full" : "";
  const disabledClass = (disabled || loading) ? "cursor-not-allowed opacity-50" : "cursor-pointer";
  
  return `${baseClasses} ${variantClasses} ${sizeClasses} ${widthClass} ${disabledClass}`;
}
</script>

<button
  {type}
  class="{getButtonClasses()} {className}"
  {disabled}
  on:click={handleClick}
  aria-label={text || displayText}
>
  {#if loading}
    <div class="spinner w-4 h-4 border-2 border-transparent border-t-current rounded-full" aria-hidden="true"></div>
  {:else if showIcon && displayIcon}
    <span aria-hidden="true">{displayIcon}</span>
  {/if}
  
  <span>{displayText}</span>
</button>

<style>
  /* Button base styles */
  button {
    position: relative;
    overflow: hidden;
    text-decoration: none;
    transition: all 0.2s ease;
    border-radius: 0.5rem; /* rounded-lg equivalent */
  }

  /* Primary button variant */
  :global(.auth-btn-primary) {
    background: var(--color-brand-primary, #988ACA);
    color: white;
    border: 2px solid transparent;
  }

  :global(.auth-btn-primary:hover:not(:disabled)) {
    background: var(--color-brand-primary-hover, #7B6BB7);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(152, 138, 202, 0.5), 0 3px 12px rgba(152, 138, 202, 0.3);
  }

  :global(.auth-btn-primary:active:not(:disabled)) {
    transform: translateY(0);
    background: var(--color-brand-primary-active, #654CA3);
    box-shadow: 0 3px 12px rgba(152, 138, 202, 0.4);
  }

  /* Secondary button variant */
  :global(.auth-btn-secondary) {
    background: transparent;
    color: var(--color-brand-primary, #988ACA);
    border: 2px solid var(--color-brand-primary, #988ACA);
  }

  :global(.auth-btn-secondary:hover:not(:disabled)) {
    background: var(--color-brand-primary, #988ACA);
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 5px 18px rgba(152, 138, 202, 0.4), 0 2px 10px rgba(152, 138, 202, 0.2);
  }

  :global(.auth-btn-secondary:active:not(:disabled)) {
    transform: translateY(0);
    background: var(--color-brand-primary-hover, #7B6BB7);
    box-shadow: 0 3px 10px rgba(152, 138, 202, 0.3);
  }

  /* Ghost button variant */
  :global(.auth-btn-ghost) {
    background: transparent;
    color: var(--auth-text-secondary, #6b7280);
    border: 2px solid transparent;
  }

  :global(.auth-btn-ghost:hover:not(:disabled)) {
    background: var(--auth-background-muted, #f3f4f6);
    color: var(--auth-text-primary, #111827);
  }

  /* Disabled state for all variants */
  button:disabled {
    cursor: not-allowed !important;
    opacity: 0.5 !important;
    transform: none !important;
    box-shadow: none !important;
  }

  /* Loading spinner */
  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>

