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
  // Use @thepia/branding Tailwind classes
  const baseClasses = "flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[2.75rem]";
  
  let variantClasses = "";
  if (variant === 'primary') {
    variantClasses = "btn-brand"; // Use the branding preset class
  } else if (variant === 'secondary') {
    variantClasses = "bg-white border-2 border-brand-primary text-brand-primary hover:bg-brand-primarySubtle";
  } else {
    variantClasses = "bg-transparent border-transparent text-text-secondary hover:bg-neutral-100";
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
    <div class="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" aria-hidden="true"></div>
  {:else if showIcon && displayIcon}
    <span aria-hidden="true">{displayIcon}</span>
  {/if}
  
  <span>{displayText}</span>
</button>

<!-- Using @thepia/branding Tailwind classes - no custom CSS needed -->

