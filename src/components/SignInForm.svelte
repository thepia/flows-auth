<!--
  SignInForm - Simple wrapper around SignInCore with border/popup functionality
  The actual auth logic is handled by SignInCore component
-->
<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  import { WarningCircle as AlertTriangle, CheckCircle, User as UserIcon, Key, Lock, Shield, Certificate as BadgeCheck } from 'phosphor-svelte';

  import type { User, AuthError, AuthMethod } from '../types';
  import type { SvelteAuthStore } from '../stores/adapters/svelte';
  import { getAuthStoreFromContext } from '../utils/auth-context';
  import SignInCore from './core/SignInCore.svelte';
  import { m } from '../utils/i18n';

  

  

  

  

  
  interface Props {
    // Auth store prop (preferred)
    store?: SvelteAuthStore | null;
    // Presentational props only
    showLogo?: boolean;
    compact?: boolean;
    className?: string;
    initialEmail?: string;
    // Size and display variants
    size?: 'small' | 'medium' | 'large' | 'full';
    variant?: 'inline' | 'popup';
    popupPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    // Popup modal controls
    showCloseButton?: boolean;
    closeOnEscape?: boolean;
    // Text keys
    titleKey?: string;
    subtitleBrandedKey?: string;
    subtitleKey?: string;
    explainFeatures?: boolean; // Whether to show features list in explainer
  }

  let {
    store = null,
    showLogo = true,
    compact = false,
    className = '',
    initialEmail = '',
    size = 'medium',
    variant = 'inline',
    popupPosition = 'top-right',
    showCloseButton = true,
    closeOnEscape = true,
    titleKey = 'signIn.title',
    subtitleBrandedKey = 'signIn.subtitle',
    subtitleKey = 'signIn.subtitleGeneric',
    explainFeatures = false
  }: Props = $props();


  // Events
  const dispatch = createEventDispatcher<{
    success: { user: User; method: AuthMethod };
    error: { error: AuthError };
    stepChange: { step: string };
    close: {}; // New event for popup close
  }>();

  // Auth store - use prop or fallback to context
  const authStore = store || getAuthStoreFromContext();

  if (!authStore) {
    throw new Error('SignInForm requires store prop or auth store in context');
  }

  let authConfig = $derived(authStore?.getConfig?.());
  let logoConfig = $derived(authConfig?.branding);

  function getDisplayText(key: string, variables?: Record<string, any>): string {
    const fn = (m as unknown as Record<string, (vars?: any) => string>)[key];
    return typeof fn === 'function' ? fn(variables) : key;
  }

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

  // Dynamic class names based on props
  let authFormClasses = $derived([
    'auth-form',
    `auth-form--${size}`,
    `auth-form--${variant}`,
    variant === 'popup' ? `pos-${popupPosition}` : '',
    compact ? 'auth-form--compact' : '',
    className
  ].filter(Boolean).join(' '));
</script>

<div class={authFormClasses}>

  <!-- Popup close button -->
  {#if variant === 'popup' && showCloseButton}
    <button
      class="popup-close"
      onclick={handleClose}
      aria-label="Close sign-in dialog"
    >
      ✕
    </button>
  {/if}

  {#if showLogo && logoConfig?.logoUrl}
    <div class="auth-logo">
      <img src={logoConfig.logoUrl} alt={logoConfig.companyName || 'Logo'} />
    </div>
  {/if}

          <!-- Header Icon (added to SignInForm via custom styling) -->
           <!--
        <div class="auth-header-icon">
          <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd"></path>
            </svg>
          </div>
        </div>
-->

    <!-- Title and Description Section -->
    <div class="auth-header">
      <h2 class="auth-title font-brand-lead">{getDisplayText(titleKey)}</h2>
      <p class="auth-description">
        {#if authConfig?.branding?.companyName}
          {getDisplayText(subtitleBrandedKey, { companyName: authConfig.branding.companyName })}
        {:else}
          {getDisplayText(subtitleKey)}
        {/if}
      </p>
    </div>


  <div class="auth-container">
    <!-- SignInCore handles all auth logic -->
    <SignInCore
      store={authStore}
      {explainFeatures}
      {initialEmail}
      on:success={handleSuccess}
      on:error={handleError}
    />
  </div>

</div>

<!-- Powered by footer (matches AccountCreationForm pattern) -->
{#if authConfig?.branding?.showPoweredBy == true}
  <div class="auth-footer">
    <p class="powered-by">
      {getDisplayText('branding.securedBy')} <strong>{getDisplayText('branding.poweredBy')}</strong>
    </p>
  </div>
{/if}

<style>
  /* Container and layout styles */
  .auth-form {
    background: white;
    border: 1px solid var(--color-border-subtle, var(--auth-border-subtle, #e5e7eb));
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
    border-color: var(--color-border-default, var(--auth-border, #d1d5db));
    /* Ensure close button is positioned relative to this container */
    /* position: relative is already set on .auth-form, but we need it here too for fixed positioning */
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
    background: white;
    border: 1px solid var(--color-border-subtle, var(--auth-border-subtle, #e5e7eb));
    font-size: 18px;
    color: var(--color-text-secondary, var(--auth-text-secondary, #6b7280));
    cursor: pointer;
    padding: 8px;
    line-height: 1;
    z-index: 1001;
    border-radius: 4px;
    transition: all 0.2s;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .popup-close:hover {
    background: var(--color-bg-secondary, var(--auth-background-muted, #f3f4f6));
    color: var(--color-text-primary, var(--auth-text-primary, #111827));
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

  /* Auth header styles */
  .auth-header {
    /* font-family: var(--font-fontFamily-brand-body, var(--auth-font-family)); */
    padding: 24px 24px 0;
    text-align: center;
  }

  .auth-title {
    font-size: 24px;
    font-weight: 600;
    color: var(--color-text-primary, var(--auth-text-primary, #111827));
    margin: 0 0 8px 0;
    line-height: 1.3;
  }

  .auth-description {
    font-size: 16px;
    color: var(--color-text-secondary, var(--auth-text-secondary, #6b7280));
    margin: 0;
    line-height: 1.5;
  }

  /* Container for SignInCore */
  .auth-container {
    padding: 24px;
  }

  .auth-form--compact .auth-container {
    padding: 16px;
  }

  .auth-form--compact .auth-header {
    padding: 16px 16px 0;
  }

  .auth-form--compact .auth-title {
    font-size: 20px;
  }

  .auth-form--compact .auth-description {
    font-size: 14px;
  }

  /* Error state */
  .config-error {
    text-align: center;
    color: var(--color-text-error, var(--auth-error-text, #dc2626));
    padding: 20px;
    font-size: 14px;
  }

    .auth-policy-footer {
    padding: 1.5rem 2rem 2rem 2rem;
    border-top: 1px solid #e2e8f0;
    margin-top: 1.5rem;
  }


  /* Auth footer styles (matches AccountCreationForm pattern) */
  .auth-footer {
    text-align: center;
    margin-top: 16px;
    padding: 12px 0;
    border-top: 1px solid var(--color-border-subtle, var(--auth-border-subtle, #e5e7eb));
  }

  .powered-by {
    font-size: 12px;
    color: var(--color-text-secondary, var(--auth-text-secondary, #6b7280));
    margin: 0;
  }

  .powered-by strong {
    color: var(--color-text-primary, var(--auth-text-primary, #111827));
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