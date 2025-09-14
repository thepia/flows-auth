<!--
  SignInForm - Simple wrapper around SignInCore with border/popup functionality
  The actual auth logic is handled by SignInCore component
-->
<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy, getContext } from 'svelte';
  import { AUTH_CONTEXT_KEY } from '../constants/context-keys';
  import type { User, AuthError, AuthMethod } from '../types';
  import SignInCore from './core/SignInCore.svelte';

  // Presentational props only
  export let showLogo = true;
  export let compact = false;
  export let className = '';
  export let initialEmail = '';
  
  // Size and display variants
  export let size: 'small' | 'medium' | 'large' | 'full' = 'medium';
  export let variant: 'inline' | 'popup' = 'inline';
  export let popupPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right';
  
  // Popup modal controls
  export let showCloseButton = true;
  export let closeOnEscape = true;

  // Events
  const dispatch = createEventDispatcher<{
    success: { user: User; method: AuthMethod };
    error: { error: AuthError };
    stepChange: { step: string };
    close: {}; // New event for popup close
  }>();

  // Popup close functionality
  function handleClose() {
    dispatch('close', {});
  }

  // Handle escape key for popup
  function handleKeydown(event: KeyboardEvent) {
    if (closeOnEscape && event.key === 'Escape' && variant === 'popup') {
      handleClose();
    }
  }

  // Event handlers for SignInCore events
  function handleSuccess(event: CustomEvent<{ user: User; method: AuthMethod }>) {
    dispatch('success', event.detail);
  }

  function handleError(event: CustomEvent<{ error: AuthError }>) {
    dispatch('error', event.detail);
  }

  // Setup popup behavior
  onMount(() => {
    if (variant === 'popup' && closeOnEscape) {
      document.addEventListener('keydown', handleKeydown);
    }
  });

  onDestroy(() => {
    if (variant === 'popup' && closeOnEscape) {
      document.removeEventListener('keydown', handleKeydown);
    }
  });

  // Get auth config from context for logo display only
  const authStoreContext = getContext(AUTH_CONTEXT_KEY);
  $: authStore = $authStoreContext;
  $: logoConfig = authStore?.getConfig?.()?.branding;

  // Dynamic class names based on props
  $: authFormClasses = [
    'auth-form',
    `auth-form--${size}`,
    `auth-form--${variant}`,
    variant === 'popup' ? `pos-${popupPosition}` : '',
    compact ? 'auth-form--compact' : '',
    className
  ].filter(Boolean).join(' ');
</script>

<!-- Popup close button -->
{#if variant === 'popup' && showCloseButton}
  <button 
    class="popup-close" 
    on:click={handleClose}
    aria-label="Close sign-in dialog"
  >
    ✕
  </button>
{/if}

<div class={authFormClasses}>
  
  {#if showLogo && logoConfig?.logoUrl}
    <div class="auth-logo">
      <img src={logoConfig.logoUrl} alt={logoConfig.companyName || 'Logo'} />
    </div>
  {/if}

  <div class="auth-container">
    <!-- SignInCore handles all auth logic and context access -->
    <SignInCore 
      {initialEmail}
      on:success={handleSuccess}
      on:error={handleError}
    />
  </div>
  
</div>

<style>
  /* Container and layout styles */
  .auth-form {
    background: white;
    border: 1px solid var(--color-border-light, #e5e7eb);
    border-radius: 8px;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    max-width: 400px;
    margin: 0 auto;
    position: relative;
  }

  .auth-form--small {
    max-width: 320px;
    font-size: 14px;
  }

  .auth-form--medium {
    max-width: 400px;
    font-size: 16px;
  }

  .auth-form--large {
    max-width: 480px;
    font-size: 18px;
  }

  .auth-form--full {
    max-width: 100%;
    width: 100%;
  }

  .auth-form--compact {
    padding: 16px;
  }

  /* Popup variant styles */
  .auth-form--popup {
    position: fixed;
    z-index: 1000;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    border-color: var(--color-border, #d1d5db);
  }

  .auth-form.pos-top-right {
    top: 20px;
    right: 20px;
  }

  .auth-form.pos-top-left {
    top: 20px;
    left: 20px;
  }

  .auth-form.pos-bottom-right {
    bottom: 20px;
    right: 20px;
  }

  .auth-form.pos-bottom-left {
    bottom: 20px;
    left: 20px;
  }

  /* Popup close button */
  .popup-close {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    font-size: 18px;
    color: var(--color-text-secondary, #6b7280);
    cursor: pointer;
    padding: 4px;
    line-height: 1;
    z-index: 10;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .popup-close:hover {
    background: var(--color-bg-secondary, #f3f4f6);
    color: var(--color-text-primary, #111827);
  }

  /* Logo styles */
  .auth-logo {
    text-align: center;
    margin-bottom: 24px;
    padding: 24px 24px 0;
  }

  .auth-logo img {
    height: 40px;
    max-width: 200px;
    object-fit: contain;
  }

  /* Container for SignInCore */
  .auth-container {
    padding: 24px;
  }

  .auth-form--compact .auth-container {
    padding: 16px;
  }

  /* Error state */
  .config-error {
    text-align: center;
    color: var(--color-error, #dc2626);
    padding: 20px;
    font-size: 14px;
  }

  /* Responsive adjustments */
  @media (max-width: 480px) {
    .auth-form--popup {
      position: fixed;
      top: 20px;
      left: 20px;
      right: 20px;
      max-width: none;
    }
    
    .auth-form.pos-top-right,
    .auth-form.pos-top-left,
    .auth-form.pos-bottom-right,
    .auth-form.pos-bottom-left {
      top: 20px;
      left: 20px;
      right: 20px;
      bottom: auto;
    }
  }
</style>