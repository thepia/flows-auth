<!--
  AuthButton - State-aware authentication button component
  Features: loading states, different auth methods, customizable appearance, i18n support
-->
<script lang="ts">
  import { run } from 'svelte/legacy';

import { createEventDispatcher } from 'svelte';
import type { SingleButtonConfig } from '@thepia/flows-auth';
import { m } from '@thepia/flows-auth';
import { Key, Envelope, Fingerprint, SmileyWink } from 'phosphor-svelte';








  interface Props {
    // Props
    type?: 'submit' | 'button';
    loading?: boolean;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    className?: string;
    // Method-specific text and icons (legacy - use buttonConfig instead)
    supportsWebAuthn?: boolean;
    // AppCode awareness for pin vs magic link (legacy)
    isAppCodeBased?: boolean;
    // NEW: Button configuration object (preferred approach)
    buttonConfig: SingleButtonConfig;
  }

  let {
    type = 'submit',
    loading = false,
    variant = 'primary',
    size = 'md',
    fullWidth = true,
    className = '',
    supportsWebAuthn = false,
    isAppCodeBased = false,
    buttonConfig
  }: Props = $props();

// Events
const dispatch = createEventDispatcher<{
  click: { method: string };
}>();


// Declare reactive variables with default values
let effectiveSupportsWebAuthn: boolean = $state(false);
let effectiveDisabled: boolean = $state(false);
let displayText: string = $state('');



function getDisplayText(): string {
  // Use Paraglide message functions directly - no legacy i18n
  if (loading && buttonConfig.loadingTextKey && buttonConfig.loadingTextKey in m) {
    return (m as unknown as {[key: string]: () => string})[buttonConfig.loadingTextKey]();
    // // Map common loading text keys to Paraglide functions
    // switch (buttonConfig.loadingTextKey) {
    //   case 'auth.signingIn': return m.auth_signingIn();
    //   case 'auth.sendingPin': return m.auth_sendingPin();
    //   case 'auth.sendingMagicLink': return m.auth_sendingMagicLink();
    //   case 'code.verifying': return m.code_verifying();
    //   default: return m.auth_loading();
    // }
  }
  if (buttonConfig.textKey && buttonConfig.textKey in m) {
    return (m as unknown as {[key: string]: () => string})[buttonConfig.textKey]();
  }

  // Use Paraglide message functions directly
  if (loading) {
    switch (buttonConfig.method) {
      case 'passkey': return m["auth.signingIn"]();
      case 'email':
      case 'email-code': return m["auth.sendingPin"]();
      case 'magic-link': return m["auth.sendingMagicLink"]();
      case 'continue-touchid':
      case 'continue-faceid':
      case 'continue-biometric': return m["auth.signingIn"]();
      default: return m["auth.loading"]();
    }
  }

  switch (buttonConfig.method) {
    case 'passkey':
      if (effectiveSupportsWebAuthn && isAppleDevice) {
        // Use generic "Touch ID/Face ID" text for better reliability and UX
        // Specific detection is unreliable and WebAuthn intentionally obscures biometric details
        return m["auth.continueWithBiometric"](); // "Continue with Touch ID/Face ID"
      }
      return effectiveSupportsWebAuthn ? m["auth.signInWithPasskey"]() : m["auth.signIn"]();
    case 'email':
      // AppCode-aware: use pin or magic link text
      return isAppCodeBased ? m["auth.sendPinByEmail"]() : m["auth.sendMagicLink"]();
    case 'email-code':
      return m["auth.sendPinByEmail"]();
    case 'magic-link':
      return m["auth.sendMagicLink"]();
    case 'continue-touchid':
      return m["auth.continueWithTouchId"]();
    case 'continue-faceid':
      return m["auth.continueWithFaceId"]();
    case 'continue-biometric':
      // Use generic biometric text for better reliability
      // Specific biometric detection is unreliable and not recommended
      return m["auth.continueWithBiometric"](); // "Continue with Touch ID/Face ID"
    default:
      return m["action.continue"]();
  }
}

// Apple device detection functions
function detectAppleDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
}

// Note: Specific Touch ID/Face ID detection removed in favor of generic biometric text
// This provides better reliability and follows WebAuthn privacy principles

function getDisplayIconComponent() {
  if (loading) return null;
  if (!buttonConfig?.method) return null; // Safety check

  switch (buttonConfig.method) {
    case 'passkey':
      // Use fingerprint icon for Apple devices, key icon for others
      return isAppleDevice ? Fingerprint : Key;
    case 'email':
    case 'email-code':
    case 'magic-link':
      return Envelope;
    case 'continue-touchid':
      return Fingerprint;
    case 'continue-faceid':
      return SmileyWink;
    case 'continue-biometric':
      return Fingerprint; // Generic fingerprint icon for biometric
    default:
      return null;
  }
}

function handleClick(event: MouseEvent) {
  if (effectiveDisabled || loading) {
    event.preventDefault();
    return;
  }

  // Dispatch custom click event for components that need it
  dispatch('click', { method: buttonConfig.method });

  // For type="submit" buttons, let the native form submission happen
  // Don't preventDefault - the form's on:submit handler will catch it
}

// Apple device detection for biometric text
let isAppleDevice = $derived(detectAppleDevice());
// Resolve effective values from buttonConfig or legacy props
run(() => {
  effectiveSupportsWebAuthn = buttonConfig ? buttonConfig.supportsWebAuthn : supportsWebAuthn;
});
run(() => {
  effectiveDisabled = buttonConfig?.disabled || false;
});
// Dynamic content based on method and state - explicitly depend on effective values
run(() => {
  // Reference all dependencies to make this reactive
  effectiveSupportsWebAuthn; loading; buttonConfig; isAppleDevice; isAppCodeBased;
  displayText = getDisplayText();
});
let displayIconComponent = $derived(getDisplayIconComponent());
// Reactive disabled state for template
let isDisabled = $derived(effectiveDisabled || loading);
// Matches ../icons/Icon.svelte's sizeMap (--icon-size-sm/md/lg) - kept as a plain
// number here rather than routing through Icon.svelte, since that component
// also forces a --color-brand-primary icon color by default, which would fight
// the button variant's own text color (white on primary, muted on ghost, etc).
const iconSizeBySize = { sm: 16, md: 20, lg: 24 };
let iconSize = $derived(iconSizeBySize[size]);
</script>

<button
  {type}
  class="auth-btn
         {variant === 'primary' ? 'auth-btn-primary' : ''}
         {variant === 'secondary' ? 'auth-btn-secondary' : ''}
         {variant === 'ghost' ? 'auth-btn-ghost' : ''}
         auth-btn-size-{size}
         {fullWidth ? 'auth-btn-full' : ''}
         {className}"
  disabled={isDisabled}
  onclick={handleClick}
  aria-label={displayText}
  aria-describedby={loading ? 'button-loading-text' : null}
>
  {#if loading}
    <div class="auth-btn-spinner" aria-hidden="true"></div>
    <span id="button-loading-text" class="auth-btn-sr-only">Signing in...</span>
  {:else if displayIconComponent}
    {@const SvelteComponent = displayIconComponent}
    <SvelteComponent size={iconSize} weight="bold" aria-hidden="true" />
  {/if}
  
  <span>{displayText}</span>
</button>

<style>
  /* Button base styles - using CSS variables for theming */
  button {
    position: relative;
    overflow: hidden;
    text-decoration: none;
  }

  /* Layout/spacing/typography previously assumed Tailwind utility classes, which
     produce no CSS at all in a consumer without Tailwind (this library has no
     Tailwind dependency and never bundles generated utilities) - hand-written
     here instead, using the same CSS custom properties as the variant colors
     below. */
  .auth-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-space-2, 0.5rem);
    font-weight: var(--font-weight-medium, 500);
    border-radius: var(--size-radius-4, 0.5rem);
    transition: all 200ms ease;
    cursor: pointer;
  }

  .auth-btn:focus-visible {
    outline: none;
    box-shadow: var(--shadow-input-focus, 0 0 0 3px rgba(152, 138, 202, 0.1));
  }

  .auth-btn-full {
    width: 100%;
  }

  /* Height per size is deliberately pinned to the same scale as the shared Icon
     component's size prop (../icons/Icon.svelte's sm/md/lg -> --icon-size-sm/md/lg,
     16/20/24px) that this button's own icon is rendered with, so a text button and
     a standalone icon button (e.g. AccountIcon's 40px default / 48px avatar) line
     up at the same height when they sit next to each other. */
  .auth-btn-size-sm {
    min-height: 2rem; /* 32px: --icon-size-sm (16px) + padding */
    padding: 0.375rem var(--size-space-3, 0.75rem);
    font-size: var(--font-size-sm, 0.875rem);
  }

  .auth-btn-size-md {
    min-height: 2.5rem; /* 40px: --icon-size-md (20px) + padding - matches AccountIcon's default 40px button */
    padding: var(--size-space-2, 0.5rem) var(--size-space-4, 1rem);
    font-size: var(--font-size-base, 1rem);
  }

  .auth-btn-size-lg {
    min-height: 3rem; /* 48px: --icon-size-lg (24px) + padding - matches AccountIcon's 48px avatar variant */
    padding: var(--size-space-3, 0.75rem) var(--size-space-5, 1.25rem);
    font-size: var(--font-size-lg, 1.125rem);
  }

  .auth-btn-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: var(--size-radius-full, 9999px);
    animation: auth-btn-spin 0.6s linear infinite;
  }

  @keyframes auth-btn-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .auth-btn-sr-only {
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

  /* Primary button variant - brand colors from CSS variables */
  :global(.auth-btn-primary) {
    background: var(--color-brand-primary, #988ACA);
    color: white;
    border: 2px solid transparent;
  }

  :global(.auth-btn-primary:hover:not(:disabled)) {
    background: var(--color-brand-primaryHover, #7B6BB7);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(152, 138, 202, 0.5), 0 3px 12px rgba(152, 138, 202, 0.3);
  }

  :global(.auth-btn-primary:active:not(:disabled)) {
    transform: translateY(0);
    background: var(--color-brand-primaryActive, #654CA3);
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
    background: var(--color-brand-primaryHover, #7B6BB7);
    box-shadow: 0 3px 10px rgba(152, 138, 202, 0.3);
  }

  /* Ghost button variant */
  :global(.auth-btn-ghost) {
    background: transparent;
    color: var(--color-text-secondary, #6b7280);
    border: 2px solid transparent;
  }

  :global(.auth-btn-ghost:hover:not(:disabled)) {
    background: var(--color-bg-secondary, #f3f4f6);
    color: var(--color-text-primary, #111827);
  }

  /* Disabled state for all variants */
  button:disabled {
    cursor: not-allowed !important;
    opacity: 0.5 !important;
    transform: none !important;
    box-shadow: none !important;
  }
</style>

