<!--
  SignInCore - Core sign-in logic without container styling
  Orchestrates EmailInput, AuthButton, and AuthStateMessage
  Handles auth state machine integration
-->
<script lang="ts">
import { createEventDispatcher, onMount } from 'svelte';
import { createAuthStore } from '../../stores/auth-store';
import type { AuthConfig, AuthError, AuthMethod, User } from '../../types';
import { isPlatformAuthenticatorAvailable, isWebAuthnSupported } from '../../utils/webauthn';

import AuthButton from './AuthButton.svelte';
import AuthStateMessage from './AuthStateMessage.svelte';
import EmailInput from './EmailInput.svelte';

// Props
export let config: AuthConfig;
export let initialEmail = '';
export let className = '';

// Customizable texts
export let texts = {
  emailLabel: 'Email address',
  emailPlaceholder: 'your.email@company.com',
  signInButton: '',  // Will use AuthButton's smart defaults
  loadingButton: '',
  webAuthnReady: '🔐 WebAuthn ready - Touch ID/Face ID will appear automatically',
  checkEmail: 'Check your email',
  magicLinkSent: 'We sent a secure login link to',
  useDifferentEmail: 'Use a different email'
};

// Events
const dispatch = createEventDispatcher<{
  success: { user: User; method: AuthMethod };
  error: { error: AuthError };
  stepChange: { step: string };
}>();

// Auth store
const authStore = createAuthStore(config);

// Component state
let email = initialEmail;
let loading = false;
let error: string | null = null;
let step: 'email-input' | 'magic-link-sent' | 'registration-terms' = 'email-input';
let supportsWebAuthn = false;
let conditionalAuthActive = false;
let userExists = false;
let hasPasskeys = false;

// WebAuthn state
let platformAuthenticatorAvailable = false;

// Initialize component
onMount(async () => {
  supportsWebAuthn = isWebAuthnSupported() && config.enablePasskeys;
  platformAuthenticatorAvailable = await isPlatformAuthenticatorAvailable();

  console.log('🔐 SignInCore WebAuthn Status:', {
    supportsWebAuthn,
    platformAuthenticatorAvailable,
    enablePasskeys: config.enablePasskeys,
  });

  // If initial email is provided, trigger conditional auth
  if (initialEmail && supportsWebAuthn) {
    await startConditionalAuthentication();
  }
});

// Handle email changes and conditional auth
async function handleEmailChange(event: CustomEvent<{value: string}>) {
  email = event.detail.value;
  error = null; // Clear errors when user types
}

async function handleConditionalAuth(event: CustomEvent<{email: string}>) {
  if (conditionalAuthActive || loading) return;
  
  try {
    conditionalAuthActive = true;
    console.log('🔍 Starting conditional authentication for:', event.detail.email);

    const success = await authStore.startConditionalAuthentication(event.detail.email);
    if (success) {
      console.log('✅ Conditional authentication successful');
      dispatch('success', {
        user: $authStore.user,
        method: 'passkey',
      });
    }
  } catch (error) {
    // Conditional auth should fail silently - expected if no passkeys exist
    console.log('⚠️ Conditional authentication failed (expected if no passkeys):', error);
  } finally {
    conditionalAuthActive = false;
  }
}

async function startConditionalAuthentication() {
  if (conditionalAuthActive || !email.trim()) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return;

  await handleConditionalAuth(new CustomEvent('conditionalAuth', { 
    detail: { email } 
  }));
}

// Handle primary sign in action
async function handleSignIn() {
  if (!email.trim()) return;

  loading = true;
  error = null;

  try {
    // Check what auth methods are available for this email
    const userCheck = await authStore.checkUser(email);
    userExists = userCheck.exists;
    hasPasskeys = userCheck.hasWebAuthn;

    if (userCheck.hasWebAuthn && supportsWebAuthn) {
      // Try passkey authentication first
      try {
        await handlePasskeyAuth();
      } catch (passkeyError) {
        console.warn('Passkey authentication failed:', passkeyError);
        // Fall back to magic link if enabled
        if (config.enableMagicLinks) {
          try {
            await handleMagicLinkAuth();
          } catch (magicLinkError) {
            console.warn('Magic link failed:', magicLinkError);
            error = getUserFriendlyErrorMessage(magicLinkError);
            loading = false;
          }
        } else {
          error = getUserFriendlyErrorMessage(passkeyError);
          loading = false;
        }
      }
    } else if (userExists && config.enableMagicLinks) {
      // User exists but no passkey - send magic link
      try {
        await handleMagicLinkAuth();
      } catch (magicLinkError) {
        console.warn('Magic link failed:', magicLinkError);
        error = 'Failed to send magic link. Please try again.';
        loading = false;
      }
    } else if (!userExists) {
      // User doesn't exist - switch to registration flow
      step = 'registration-terms';
      loading = false;
      dispatch('stepChange', { step });
    } else {
      // No authentication methods available
      error = 'No authentication methods available for this email.';
      loading = false;
    }
  } catch (err: any) {
    loading = false;
    error = getUserFriendlyErrorMessage(err);
    
    if (err.message?.includes('not found') || err.status === 404) {
      // User doesn't exist - transition to registration
      console.log('🔄 User not found - transitioning to registration');
      step = 'registration-terms';
      error = null;
      dispatch('stepChange', { step });
    }
  }
}

// Handle passkey authentication
async function handlePasskeyAuth() {
  try {
    const result = await authStore.signInWithPasskey(email);

    if (result.step === 'success' && result.user) {
      loading = false;
      dispatch('success', {
        user: result.user,
        method: 'passkey',
      });
    }
  } catch (err: any) {
    loading = false;
    error = getUserFriendlyErrorMessage(err);
    throw err;
  }
}

// Handle magic link authentication
async function handleMagicLinkAuth() {
  try {
    const result = await authStore.signInWithMagicLink(email);

    if (result.step === 'magic-link' || result.magicLinkSent) {
      step = 'magic-link-sent';
      loading = false;
      dispatch('stepChange', { step });
    }
  } catch (err: any) {
    loading = false;
    error = err.message || 'Failed to send magic link';
    throw err;
  }
}

// Convert technical errors to user-friendly messages
function getUserFriendlyErrorMessage(err: any): string {
  const message = err.message || '';
  const status = err.status || 0;

  if (message.includes('/auth/signin/magic-link') || message.includes('not found')) {
    return 'No passkey found for this email. Please register a new passkey or use a different sign-in method.';
  }

  if (message.includes('/auth/webauthn/challenge') || status === 404) {
    return 'Authentication service temporarily unavailable. Please try again in a moment.';
  }

  if (message.includes('NotAllowedError') || message.includes('cancelled')) {
    return 'Authentication was cancelled. Please try again.';
  }

  if (message.includes('NotSupportedError')) {
    return 'Passkey authentication is not supported on this device.';
  }

  if (message.includes('SecurityError')) {
    return "Security error occurred. Please ensure you're on a secure connection.";
  }

  if (message.includes('InvalidStateError')) {
    return 'No passkey available on this device. Please register a new passkey.';
  }

  return 'Authentication failed. Please try again or use a different sign-in method.';
}

function resetForm() {
  step = 'email-input';
  error = null;
  loading = false;
}

// Determine authentication method and button configuration
$: authMethod = getAuthMethod();
$: buttonConfig = getButtonConfig();

function getAuthMethod(): 'passkey' | 'email' | 'generic' {
  if (supportsWebAuthn && config.enablePasskeys) return 'passkey';
  if (config.enableMagicLinks) return 'email';
  return 'generic';
}

function getButtonConfig() {
  return {
    method: authMethod,
    supportsWebAuthn,
    text: texts.signInButton,
    loadingText: texts.loadingButton,
    disabled: loading || !email.trim()
  };
}
</script>

<div class="sign-in-core {className}">
  {#if step === 'email-input'}
    <!-- Email Input Step -->
    <form on:submit|preventDefault={handleSignIn}>
      <EmailInput
        bind:value={email}
        label={texts.emailLabel}
        placeholder={texts.emailPlaceholder}
        {error}
        disabled={loading}
        enableWebAuthn={supportsWebAuthn}
        on:change={handleEmailChange}
        on:conditionalAuth={handleConditionalAuth}
      />
      
      <div class="button-section">
        <AuthButton
          type="submit"
          method={buttonConfig.method}
          text={buttonConfig.text}
          loadingText={buttonConfig.loadingText}
          disabled={buttonConfig.disabled}
          {loading}
          supportsWebAuthn={buttonConfig.supportsWebAuthn}
          on:click={handleSignIn}
        />
      </div>

      {#if supportsWebAuthn && config.enablePasskeys}
        <AuthStateMessage
          type="info"
          message={texts.webAuthnReady}
          showIcon={true}
          className="webauthn-indicator"
        />
      {/if}
    </form>

  {:else if step === 'magic-link-sent'}
    <!-- Magic Link Sent Step -->
    <div class="magic-link-sent">
      <AuthStateMessage
        type="success"
        message="{texts.checkEmail}"
        showIcon={true}
      />
      
      <p class="magic-link-message">
        {texts.magicLinkSent}<br>
        <strong>{email}</strong>
      </p>

      <AuthButton
        type="button"
        variant="secondary"
        text={texts.useDifferentEmail}
        on:click={resetForm}
      />
    </div>

  {:else if step === 'registration-terms'}
    <!-- Registration flow would be handled by parent or separate component -->
    <AuthStateMessage
      type="info"
      message="Registration is required. Please complete the registration process."
      showIcon={true}
    />
  {/if}
</div>

<style>
  .sign-in-core {
    width: 100%;
  }

  .button-section {
    margin-top: 24px;
  }

  .magic-link-sent {
    text-align: center;
  }

  .magic-link-message {
    color: var(--auth-text-secondary, #6b7280);
    margin: 16px 0 24px 0;
    line-height: 1.5;
  }

  .magic-link-message strong {
    color: var(--auth-text-primary, #111827);
  }

  /* Global styling hook for WebAuthn indicator */
  :global(.webauthn-indicator) {
    text-align: center;
    margin-top: 16px;
  }
</style>