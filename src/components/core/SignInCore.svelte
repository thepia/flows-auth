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
  // Determine what authentication methods are available
  const browserSupportsWebAuthn = isWebAuthnSupported();
  
  supportsWebAuthn = browserSupportsWebAuthn && config.enablePasskeys;
  platformAuthenticatorAvailable = await isPlatformAuthenticatorAvailable();

  console.log('🔐 SignInCore Authentication Methods:', {
    browserSupportsWebAuthn,
    supportsWebAuthn,
    platformAuthenticatorAvailable,
    enablePasskeys: config.enablePasskeys,
    enableMagicLinks: config.enableMagicLinks,
    signInMode: config.signInMode,
  });

  // If initial email is provided, trigger conditional auth (only if passkeys enabled)
  if (initialEmail && supportsWebAuthn) {
    await startConditionalAuthentication();
  }
});

// Handle email changes and conditional auth
async function handleEmailChange(event: CustomEvent<{value: string}>) {
  email = event.detail.value;
  error = null; // Clear errors when user types
  
  console.log('📝 Email changed:', {
    newEmail: email,
    emailLength: email.length,
    emailTrim: email.trim(),
    emailTrimLength: email.trim().length,
    buttonShouldBeEnabled: !loading && !!email.trim()
  });
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

    console.log('🔍 User check result:', { userExists, hasPasskeys, email });

    // Handle non-existing users based on config
    if (!userExists) {
      if (config.signInMode === 'login-only') {
        error = 'No account found for this email address. Please check your email or create an account.';
        loading = false;
        return;
      } else {
        // Transition to registration
        console.log('🔄 User not found - transitioning to registration');
        step = 'registration-terms';
        loading = false;
        dispatch('stepChange', { step });
        return;
      }
    }

    // User exists - determine authentication method based on config and user capabilities
    const authMethod = determineAuthMethod(userCheck);
    console.log('🔐 Determined auth method:', authMethod);

    switch (authMethod) {
      case 'passkey-only':
        await handlePasskeyAuth();
        break;
      
      case 'passkey-with-fallback':
        try {
          await handlePasskeyAuth();
        } catch (passkeyError) {
          console.warn('Passkey authentication failed:', passkeyError);
          // Fall back to email if enabled
          await handleMagicLinkAuth();
        }
        break;
      
      case 'email-only':
        await handleMagicLinkAuth();
        break;
      
      default:
        error = 'No authentication methods available for this email.';
        loading = false;
    }

  } catch (err: any) {
    loading = false;
    error = getUserFriendlyErrorMessage(err);
    console.error('Authentication error:', err);
  }
}

// Determine the best authentication method based on config and user state
function determineAuthMethod(userCheck: any): 'passkey-only' | 'passkey-with-fallback' | 'email-only' | 'none' {
  const hasPasskeys = userCheck.hasWebAuthn;

  // If user has passkeys and we support them
  if (hasPasskeys && supportsWebAuthn && config.enablePasskeys) {
    // Use passkey with fallback to email if magic links are enabled
    return config.enableMagicLinks ? 'passkey-with-fallback' : 'passkey-only';
  }
  
  // If user doesn't have passkeys but we have magic links enabled
  if (config.enableMagicLinks) {
    return 'email-only';
  }

  // No authentication methods available
  return 'none';
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

  if (message.includes('not found') || message.includes('404') || message.includes('endpoint')) {
    return 'No passkey found for this email. Please register a new passkey or use a different sign-in method.';
  }

  if (message.includes('/auth/webauthn/authenticate') || message.includes('/auth/webauthn/challenge') || status === 404) {
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
$: authMethodForUI = getAuthMethodForUI(config, supportsWebAuthn);
$: buttonConfig = getButtonConfig(authMethodForUI, loading, email, supportsWebAuthn);
$: emailInputWebAuthnEnabled = getEmailInputWebAuthnEnabled(config, supportsWebAuthn);

function getAuthMethodForUI(authConfig, webAuthnSupported): 'passkey' | 'email' | 'generic' {
  const result = (() => {
    // Show passkey UI if passkeys are enabled and supported
    if (authConfig.enablePasskeys && webAuthnSupported) return 'passkey';
    
    // Show email UI if magic links are enabled
    if (authConfig.enableMagicLinks) return 'email';
    
    return 'generic';
  })();
  
  console.log('🎯 getAuthMethodForUI():', {
    enablePasskeys: authConfig.enablePasskeys,
    enableMagicLinks: authConfig.enableMagicLinks,
    supportsWebAuthn: webAuthnSupported,
    result
  });
  
  return result;
}

function getEmailInputWebAuthnEnabled(authConfig, webAuthnSupported): boolean {
  // Enable WebAuthn autocomplete if passkeys are supported and enabled in config
  return webAuthnSupported && authConfig.enablePasskeys;
}

function getButtonConfig(method, isLoading, emailValue, webAuthnSupported) {
  const buttonConfig = {
    method: method,
    supportsWebAuthn: webAuthnSupported,
    text: texts.signInButton,
    loadingText: texts.loadingButton,
    disabled: isLoading || !emailValue.trim()
  };
  
  console.log('🎯 getButtonConfig():', {
    authMethodForUI: method,
    supportsWebAuthn: webAuthnSupported,
    loading: isLoading,
    email: emailValue ? `"${emailValue}"` : 'empty',
    emailTrim: emailValue.trim(),
    emailTrimLength: emailValue.trim().length,
    disabled: buttonConfig.disabled,
    config: buttonConfig
  });
  
  return buttonConfig;
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
        enableWebAuthn={emailInputWebAuthnEnabled}
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