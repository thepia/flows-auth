<!--
  SignInCore - Core sign-in logic without container styling
  Orchestrates EmailInput, AuthButton, and AuthStateMessage
  Handles auth state machine integration
-->
<script lang="ts">
import { createEventDispatcher, onMount } from 'svelte';
import { createAuthStore } from '../../stores/auth-store';
import type { AuthConfig, AuthError, AuthMethod, User, SignInState, SignInEvent } from '../../types';
import { isPlatformAuthenticatorAvailable, isWebAuthnSupported } from '../../utils/webauthn';
import { getI18n } from '../../utils/i18n';

import AuthButton from './AuthButton.svelte';
import AuthStateMessage from './AuthStateMessage.svelte';
import EmailInput from './EmailInput.svelte';
import CodeInput from './CodeInput.svelte';

// Props
export let config: AuthConfig;
export let initialEmail = '';
export let className = '';

// NOTE: Legacy 'texts' prop has been removed. Use i18n translations instead.

// Get i18n instance - will use context if available, or create from config
const i18nInstance = getI18n({
  language: config?.language,
  translations: config?.translations,
  fallbackLanguage: config?.fallbackLanguage
});

// Extract the translation function store
const i18n = i18nInstance.t;

// Update i18n when config changes
$: {
  if (config?.language) {
    i18nInstance.setLanguage(config.language);
  }
  if (config?.translations) {
    i18nInstance.setTranslations(config.translations);
  }
}

// Events
const dispatch = createEventDispatcher<{
  success: { user: User; method: AuthMethod };
  error: { error: AuthError };
  stepChange: { step: string };
}>();

// Auth store
const authStore = createAuthStore(config);

// Component state
// Extend SignInState with additional states needed by SignInCore
type SignInCoreStep = SignInState | 'magicLinkSent' | 'registrationTerms';
let email = initialEmail;
let loading = false;
let error: string | null = null;

// Local state for non-SignInState steps
let localStep: 'magicLinkSent' | 'registrationTerms' | null = null;
let currentSignInState: SignInState = $authStore.signInState;

// Computed step: use localStep if set, otherwise use current signInState
$: step = localStep || (currentSignInState as SignInCoreStep);

// React to step changes and dispatch stepChange events
$: if (step) {
  dispatch('stepChange', { step });
}

// Subscribe to store changes for external updates (e.g., successful auth from other components)
$: {
  const storeState = $authStore.signInState;
  // Only update if we're not in a local step and the store changed externally
  if (localStep === null && storeState !== currentSignInState) {
    currentSignInState = storeState;
  }
}

// Helper to set local-only steps
function setLocalStep(localStepValue: typeof localStep) {
  localStep = localStepValue;
  // Clear localStep when returning to SignInState flow
  if (localStepValue === null) {
    currentSignInState = authStore.sendSignInEvent({ type: 'RESET' });
  }
}

// Helper to send SignInEvents to the auth store and update local state
function sendSignInEvent(event: SignInEvent) {
  currentSignInState = authStore.sendSignInEvent(event);
  // Clear any local step override when transitioning via events
  if (localStep !== null) {
    localStep = null;
  }
  return currentSignInState;
}
let supportsWebAuthn = false;
let conditionalAuthActive = false;
let userExists = false;
let hasPasskeys = false;
let hasValidPin = false;
let pinRemainingMinutes = 0;

// Email code state
let emailCode = '';
let emailCodeSent = false;

// WebAuthn state
let platformAuthenticatorAvailable = false;

// Pin validation helper
function checkForValidPin(userCheck: any): boolean {
  if (!userCheck || !userCheck.lastPinExpiry) return false;
  
  try {
    const expiryTime = new Date(userCheck.lastPinExpiry);
    const now = new Date();
    return expiryTime > now; // Pin is still valid if expiry is in the future
  } catch (error) {
    console.error('Error parsing pin expiry time:', error);
    return false;
  }
}

// Calculate remaining minutes for valid pin
function getRemainingPinMinutes(userCheck: any): number {
  if (!userCheck || !userCheck.lastPinExpiry) return 0;
  
  try {
    const expiryTime = new Date(userCheck.lastPinExpiry);
    const now = new Date();
    const remainingMs = expiryTime.getTime() - now.getTime();
    // Handle NaN case from invalid dates
    if (isNaN(remainingMs)) return 0;
    return Math.max(0, Math.ceil(remainingMs / (1000 * 60))); // Convert to minutes
  } catch (error) {
    console.error('Error calculating pin remaining time:', error);
    return 0;
  }
}

// Debounced function to check email for existing pins (reactive statement compatible)
let emailCheckTimeout: ReturnType<typeof setTimeout> | undefined;
async function checkEmailForExistingPin(emailValue: string) {
  // Clear any existing timeout to debounce rapid changes
  if (emailCheckTimeout) {
    clearTimeout(emailCheckTimeout);
  }

  emailCheckTimeout = setTimeout(async () => {
    if (!emailValue.trim()) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue.trim())) return;

    // Avoid duplicate calls for same email
    if (emailValue.trim() === lastCheckedEmail) return;
    
    try {
      console.log('🔍 Reactive email pin check for:', emailValue.trim());
      lastCheckedEmail = emailValue.trim(); // Set before API call to prevent race conditions
      const userCheck = await authStore.checkUser(emailValue.trim());
      hasValidPin = checkForValidPin(userCheck);
      pinRemainingMinutes = getRemainingPinMinutes(userCheck);
      userExists = userCheck.exists;
      hasPasskeys = userCheck.hasWebAuthn;
      
      console.log('🔍 Reactive pin check result:', { 
        email: emailValue.trim(),
        hasValidPin,
        lastPinExpiry: userCheck.lastPinExpiry,
        userExists,
        hasPasskeys
      });
      
      // Send USER_CHECKED event to transition the state machine to userChecked state
      sendSignInEvent({ 
        type: 'USER_CHECKED', 
        email: emailValue.trim(), 
        exists: userCheck.exists, 
        hasPasskey: userCheck.hasWebAuthn 
      });
    } catch (error) {
      console.warn('Error in reactive email pin check:', error);
    }
  }, 500); // 500ms debounce to avoid too many API calls while typing
}

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

  // If initial email is provided, check for existing pins and trigger conditional auth
  if (initialEmail) {
    email = initialEmail;
    
    // Check for existing valid pins if app code is configured
    if (config.appCode) {
      try {
        const userCheck = await authStore.checkUser(initialEmail);
        hasValidPin = checkForValidPin(userCheck);
        userExists = userCheck.exists;
        hasPasskeys = userCheck.hasWebAuthn;
        
        console.log('🔍 Initial pin check result:', { 
          email: initialEmail,
          hasValidPin,
          lastPinExpiry: userCheck.lastPinExpiry,
          userExists,
          hasPasskeys
        });
        
        // Don't auto-advance to pin input on mount - let user choose their authentication method
        // The pin status message and smart button configuration will show appropriate options
      } catch (error) {
        console.warn('Error checking for existing pins on mount:', error);
      }
    }
    
    // Also trigger conditional auth if passkeys are enabled
    if (supportsWebAuthn) {
      await startConditionalAuthentication();
    }
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

  // Note: Pin checking is now handled by the reactive statement and debounced function
  // This avoids duplicate API calls
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

// Direct action to go to pin input when pin status message is clicked
function goToPinInput() {
  if (!hasValidPin || !email.trim()) {
    return;
  }
  
  // We should already be in userChecked state from reactive email checking
  // Just send SENT_PIN_EMAIL to transition to pinEntry
  emailCodeSent = true; // Mark as sent since we have a valid pin
  sendSignInEvent({ type: 'SENT_PIN_EMAIL' });
}

// Handle secondary action (pin fallback when passkey is primary)
async function handleSecondaryAction() {
  if (!email.trim() || !buttonConfig.secondary) return;

  loading = true;
  error = null;

  try {
    const secondaryMethod = buttonConfig.secondary.method;
    
    if (secondaryMethod === 'email-code') {
      // Check if user has a valid pin first
      if (hasValidPin) {
        // Skip sending new code, go directly to verification step
        console.log('🔢 Secondary action: Valid pin detected, going to verification step');
        emailCodeSent = true;
        loading = false;
        sendSignInEvent({ type: 'SENT_PIN_EMAIL' });
      } else {
        // Send new pin
        console.log('📧 Secondary action: Sending new pin');
        await handleEmailCodeAuth();
      }
    } else if (secondaryMethod === 'magic-link') {
      console.log('🔗 Secondary action: Sending magic link');
      await handleMagicLinkAuth();
    }
  } catch (err: any) {
    loading = false;
    error = getUserFriendlyErrorMessage(err);
    console.error('Secondary authentication error:', err);
  }
}

// Handle primary sign in action
async function handleSignIn() {
  if (!email.trim()) return;

  loading = true;
  error = null;
  
  // Don't send any event here - will send USER_CHECKED after checkUser completes

  try {
    // Check what auth methods are available for this email
    const userCheck = await authStore.checkUser(email);
    userExists = userCheck.exists;
    hasPasskeys = userCheck.hasWebAuthn;

    // Check for valid existing pin
    hasValidPin = checkForValidPin(userCheck);
    
    console.log('🔍 User check result:', { 
      userExists, 
      hasPasskeys, 
      email,
      hasValidPin,
      lastPinExpiry: userCheck.lastPinExpiry 
    });

    // Handle non-existing users based on config
    if (!userExists) {
      if (config.signInMode === 'login-only') {
        error = 'No account found for this email address. Please check your email or create an account.';
        loading = false;
        return;
      } else {
        // Transition to registration (not a SignInState, keep as local state change)
        console.log('🔄 User not found - transitioning to registration');
        loading = false;
        sendSignInEvent({ 
          type: 'USER_CHECKED', 
          email: email.trim(), 
          exists: false, 
          hasPasskey: false 
        });
        setLocalStep('registrationTerms');
        return;
      }
    }

    // User exists - send USER_CHECKED event and determine authentication method
    sendSignInEvent({ 
      type: 'USER_CHECKED', 
      email: email.trim(), 
      exists: userExists, 
      hasPasskey: hasPasskeys 
    });
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
          // Fall back to appropriate email method
          if (config.appCode) {
            await handleEmailCodeAuth();
          } else {
            await handleMagicLinkAuth();
          }
        }
        break;
      
      case 'email-code':
        // Check if user has a valid pin first
        if (hasValidPin) {
          // Skip sending new code, go directly to verification step
          console.log('🔢 Valid pin detected, skipping email send and going to verification step');
          emailCodeSent = true;
          loading = false;
          sendSignInEvent({ type: 'SENT_PIN_EMAIL' });
        } else {
          await handleEmailCodeAuth();
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
function determineAuthMethod(userCheck: any): 'passkey-only' | 'passkey-with-fallback' | 'email-code' | 'email-only' | 'none' {
  const hasPasskeys = userCheck.hasWebAuthn;

  // If user has passkeys and we support them
  if (hasPasskeys && supportsWebAuthn && config.enablePasskeys) {
    // Use passkey with fallback to email if other email methods are enabled
    const hasEmailFallback = config.appCode || config.enableMagicLinks;
    return hasEmailFallback ? 'passkey-with-fallback' : 'passkey-only';
  }
  
  // If app-based email authentication is available
  if (config.appCode) {
    return 'email-code';
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
      loading = false;
      setLocalStep('magicLinkSent');
    }
  } catch (err: any) {
    loading = false;
    error = err.message || 'Failed to send magic link';
    throw err;
  }
}

// Handle email code authentication (transparently uses app endpoints if configured)
async function handleEmailCodeAuth() {
  try {
    const result = await authStore.sendEmailCode(email);
    
    if (result.success) {
      // Notify auth store that PIN was sent to drive state transition
      authStore.notifyPinSent();
      
      emailCodeSent = true;
      loading = false;
    } else {
      throw new Error(result.message || 'Failed to send email code');
    }
  } catch (err: any) {
    loading = false;
    error = err.message || 'Failed to send email verification code';
    throw err;
  }
}

// Handle email code verification
async function handleEmailCodeVerification() {
  if (!emailCode.trim()) {
    error = 'Please enter the verification code';
    return;
  }

  loading = true;
  error = null;

  try {
    const result = await authStore.verifyEmailCode(email, emailCode);
    
    if (result.step === 'success' && result.user) {
      loading = false;
      
      // Notify auth store that PIN was verified to drive state transition
      const sessionData = {
        accessToken: result.accessToken || '',
        refreshToken: result.refreshToken || '',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name || '',
          emailVerified: result.user.emailVerified || false
        },
        expiresAt: result.expiresIn ? Date.now() + (result.expiresIn * 1000) : Date.now() + (24 * 60 * 60 * 1000),
        lastActivity: Date.now()
      };
      authStore.notifyPinVerified(sessionData);
      
      // Clear pin state after successful verification to prevent reuse
      hasValidPin = false;
      pinRemainingMinutes = 0;
      
      // Pin should be invalidated server-side by the API after successful verification
      // The /{appCode}/verify-email endpoint should clear lastPinExpiry on the WorkOS user record
      
      dispatch('success', {
        user: result.user,
        method: 'email-code' as AuthMethod
      });
    } else {
      throw new Error('Email code verification failed');
    }
  } catch (err: any) {
    loading = false;
    error = getUserFriendlyErrorMessage(err);
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
  sendSignInEvent({ type: 'RESET' });
  localStep = null; // Clear local step override
  error = null;
  loading = false;
  emailCode = '';
  emailCodeSent = false;
  hasValidPin = false;
  userExists = false;
  hasPasskeys = false;
}

// Determine authentication method and button configuration
$: authMethodForUI = getAuthMethodForUI(config, supportsWebAuthn);
$: buttonConfig = getButtonConfig(authMethodForUI, loading, email, supportsWebAuthn, userExists, hasPasskeys, hasValidPin);
$: emailInputWebAuthnEnabled = getEmailInputWebAuthnEnabled(config, supportsWebAuthn);

// Keep track of last checked email to avoid duplicate calls
let lastCheckedEmail = '';

// Reactive statement to check for existing pins when email changes (handles autocomplete)
$: if (email && config.appCode && step === 'emailEntry' && email.trim() !== lastCheckedEmail) {
  checkEmailForExistingPin(email);
}

function getAuthMethodForUI(authConfig, webAuthnSupported): 'passkey' | 'email' | 'generic' {
  const result = (() => {
    // Show passkey UI if passkeys are enabled and supported
    if (authConfig.enablePasskeys && webAuthnSupported) return 'passkey';
    
    // Show email UI if organization-based or magic links are enabled
    if (authConfig.appCode || authConfig.enableMagicLinks) return 'email';
    
    return 'generic';
  })();
  
  console.log('🎯 getAuthMethodForUI():', {
    enablePasskeys: authConfig.enablePasskeys,
    enableMagicLinks: authConfig.enableMagicLinks,
    hasAppCode: !!authConfig.appCode,
    supportsWebAuthn: webAuthnSupported,
    result
  });
  
  return result;
}

function getEmailInputWebAuthnEnabled(authConfig, webAuthnSupported): boolean {
  // Enable WebAuthn autocomplete if passkeys are supported and enabled in config
  return webAuthnSupported && authConfig.enablePasskeys;
}

function getButtonConfig(method, isLoading, emailValue, webAuthnSupported, userExists, hasPasskeys, hasValidPin) {
  // Smart button configuration based on discovered user state
  let primaryMethod = method;
  let primaryText = $i18n('auth.signIn');
  let primaryLoadingText = $i18n('auth.loading');
  let secondaryAction = null;

  // Set default button text based on available authentication methods
  if (config.appCode) {
    primaryMethod = 'email-code';
    primaryText = $i18n('auth.sendPinByEmail');
    primaryLoadingText = $i18n('auth.sendingPin');
  } else if (config.enableMagicLinks) {
    primaryMethod = 'magic-link';
    primaryText = $i18n('auth.sendMagicLink');
    primaryLoadingText = $i18n('auth.sendingMagicLink');
  }

  // If we have user information and email is entered, make smart decisions
  if (emailValue && emailValue.trim() && userExists !== null) {
    if (webAuthnSupported && config.enablePasskeys && hasPasskeys) {
      // User has passkeys - prioritize passkey authentication
      primaryMethod = 'passkey';
      primaryText = $i18n('auth.signInWithPasskey');
      primaryLoadingText = $i18n('auth.signingIn');
      
      // Add secondary action for pin fallback if available
      if (config.appCode) {
        secondaryAction = {
          method: 'email-code',
          text: $i18n('auth.sendPinByEmail'),
          loadingText: $i18n('auth.sendingPin')
        };
      }
    } else if (config.appCode) {
      // User doesn't have passkeys, use pin authentication
      primaryMethod = 'email-code';
      primaryText = $i18n('auth.sendPinByEmail');
      primaryLoadingText = $i18n('auth.sendingPin');
    } else if (config.enableMagicLinks) {
      // Fallback to magic links
      primaryMethod = 'magic-link';
      primaryText = $i18n('auth.sendMagicLink');
      primaryLoadingText = $i18n('auth.sendingMagicLink');
    }
  }

  const buttonConfig = {
    primary: {
      method: primaryMethod,
      supportsWebAuthn: webAuthnSupported && primaryMethod === 'passkey',
      text: primaryText,
      loadingText: primaryLoadingText,
      disabled: isLoading || !emailValue || !emailValue.trim()
    },
    secondary: secondaryAction
  };
  
  console.log('🎯 getButtonConfig():', {
    emailValue: emailValue ? `"${emailValue}"` : 'empty',
    userExists,
    hasPasskeys,
    hasValidPin,
    originalMethod: method,
    primaryMethod,
    primaryText,
    secondaryAction: secondaryAction ? secondaryAction.text : 'none',
    config: buttonConfig
  });
  
  return buttonConfig;
}
</script>

<div class="sign-in-core {className}">
  {#if step === 'emailEntry' || step === 'userChecked'}
    <!-- Combined Auth Step - Email entry with intelligent routing -->
    <form on:submit|preventDefault={handleSignIn}>
      <EmailInput
        bind:value={email}
        label={$i18n('email.label')}
        placeholder={$i18n('email.placeholder')}
        {error}
        disabled={loading}
        enableWebAuthn={emailInputWebAuthnEnabled}
        {i18n}
        on:change={handleEmailChange}
        on:input={handleEmailChange}
        on:blur={handleEmailChange}
        on:conditionalAuth={handleConditionalAuth}
      />
      
      {#if hasValidPin && pinRemainingMinutes > 0}
        <div class="pin-status-message">
          <span class="pin-status-icon">📧</span>
          <span class="pin-status-text">
            {$i18n('status.pinValid', { 
              minutes: pinRemainingMinutes, 
              s: pinRemainingMinutes !== 1 ? 's' : '' 
            })}
            <button
              type="button"
              class="pin-direct-link"
              on:click={goToPinInput}
              disabled={loading}
            >
              {$i18n('status.pinDirectAction')}
            </button>
          </span>
        </div>
      {/if}
      
      <div class="button-section">
        <AuthButton
          type="submit"
          method={buttonConfig.primary.method}
          text={buttonConfig.primary.text}
          loadingText={buttonConfig.primary.loadingText}
          disabled={buttonConfig.primary.disabled}
          {loading}
          supportsWebAuthn={buttonConfig.primary.supportsWebAuthn}
          {i18n}
          on:click={handleSignIn}
        />
        
        {#if buttonConfig.secondary}
          <AuthButton
            type="button"
            variant="secondary"
            method={buttonConfig.secondary.method}
            text={buttonConfig.secondary.text}
            loadingText={buttonConfig.secondary.loadingText}
            disabled={loading || !email.trim()}
            {loading}
            supportsWebAuthn={false}
            {i18n}
            on:click={handleSecondaryAction}
          />
        {/if}
      </div>

      {#if supportsWebAuthn && config.enablePasskeys}
        <AuthStateMessage
          type="info"
          message={$i18n('webauthn.ready')}
          showIcon={true}
          className="webauthn-indicator"
        />
      {/if}
      
      <!-- Security explanation message -->
      <div class="security-message">
        {#if config?.branding?.companyName}
          {#if config.appCode}
            {$i18n('security.passwordlessWithPin', { companyName: config.branding.companyName })}
          {:else}
            {$i18n('security.passwordlessExplanation', { companyName: config.branding.companyName })}
          {/if}
        {:else}
          {#if config.appCode}
            {$i18n('security.passwordlessWithPinGeneric')}
          {:else}
            {$i18n('security.passwordlessGeneric')}
          {/if}
        {/if}
      </div>
    </form>

  {:else if step === 'pinEntry'}
    <!-- Email Code Input Step -->
    <div class="email-code-input">
      {#if emailCodeSent && !hasValidPin}
        <AuthStateMessage
          type="success"
          message={$i18n('status.checkEmail')}
          showIcon={true}
        />
        
        <p class="email-code-message">
          {$i18n('status.emailSent')}<br>
          <strong>{email}</strong>
        </p>
      {:else}
        <AuthStateMessage
          type="info"
          message={$i18n('status.pinDetected')}
          showIcon={true}
        />
        
        <p class="email-code-message">
          Enter the verification code from your recent email<br>
          <strong>{email}</strong>
        </p>
      {/if}

      <form on:submit|preventDefault={handleEmailCodeVerification}>
        <CodeInput
          bind:value={emailCode}
          label="Verification Code"
          placeholder="Enter 6-digit code"
          {error}
          disabled={loading}
          maxlength={6}
          {i18n}
        />
        
        <div class="button-section">
          <AuthButton
            type="submit"
            method="email-code"
            text="Verify Code"
            loadingText="Verifying..."
            disabled={loading || !emailCode.trim()}
            {loading}
            supportsWebAuthn={false}
            {i18n}
          />
        </div>
      </form>

      <AuthButton
        type="button"
        variant="secondary"
        text={$i18n('action.useDifferentEmail')}
        {i18n}
        on:click={resetForm}
      />
    </div>

  {:else if step === 'magicLinkSent'}
    <!-- Magic Link Sent Step -->
    <div class="magic-link-sent">
      <AuthStateMessage
        type="success"
        message={$i18n('status.checkEmail')}
        showIcon={true}
      />
      
      <p class="magic-link-message">
        {$i18n('status.magicLinkSent')}<br>
        <strong>{email}</strong>
      </p>

      <AuthButton
        type="button"
        variant="secondary"
        text={$i18n('action.useDifferentEmail')}
        {i18n}
        on:click={resetForm}
      />
    </div>

  {:else if step === 'signedIn'}
    <!-- Signed In Success State -->
    <div class="signed-in-success">
      <AuthStateMessage
        type="success"
        message={$i18n('auth.signedInSuccess')}
        showIcon={true}
      />
      
      {#if $authStore.user}
        <div class="user-welcome">
          <h3>Welcome back!</h3>
          <p><strong>{$authStore.user.name || $authStore.user.email}</strong></p>
          <p class="user-email">{$authStore.user.email}</p>
        </div>
        
        <AuthButton
          type="button"
          variant="primary"
          text="Continue to App"
          {i18n}
          on:click={() => dispatch('success', { 
            user: $authStore.user, 
            method: 'email-code' 
          })}
        />
      {/if}
    </div>

  {:else if step === 'registrationTerms'}
    <!-- Registration flow would be handled by parent or separate component -->
    <AuthStateMessage
      type="info"
      message={$i18n('registration.required')}
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
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .email-code-input,
  .magic-link-sent,
  .signed-in-success {
    text-align: center;
  }

  .email-code-message,
  .magic-link-message {
    color: var(--auth-text-secondary, #6b7280);
    margin: 16px 0 24px 0;
    line-height: 1.5;
  }

  .email-code-message strong,
  .magic-link-message strong {
    color: var(--auth-text-primary, #111827);
  }

  /* Global styling hook for WebAuthn indicator */
  :global(.webauthn-indicator) {
    text-align: center;
    margin-top: 16px;
  }

  .pin-status-message {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px 16px;
    margin: 12px 0;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    font-size: 14px;
    color: #0369a1;
    line-height: 1.4;
  }

  .pin-status-icon {
    font-size: 16px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .pin-status-text {
    flex: 1;
  }

  .pin-direct-link {
    background: none;
    border: none;
    color: #0369a1;
    font-size: inherit;
    font-weight: 500;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    margin: 0 0 0 4px;
    transition: color 0.2s;
  }

  .pin-direct-link:hover:not(:disabled) {
    color: #075985;
  }

  .pin-direct-link:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    text-decoration: none;
  }
  
  /* User welcome styling for signed-in state */
  .user-welcome {
    margin: 16px 0 24px 0;
    padding: 16px;
    background: var(--auth-success-bg, #f0f9ff);
    border: 1px solid var(--auth-success-border, #bae6fd);
    border-radius: 8px;
  }

  .user-welcome h3 {
    margin: 0 0 8px 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--auth-text-primary, #111827);
  }

  .user-welcome p {
    margin: 4px 0;
    color: var(--auth-text-primary, #111827);
  }

  .user-email {
    font-size: 0.875rem;
    color: var(--auth-text-secondary, #6b7280) !important;
  }

  /* Security message styling - matches thepia.com */
  .security-message {
    margin-top: 16px;
    text-align: center;
    font-size: 0.75rem;
    color: var(--auth-text-secondary, #6b7280);
    line-height: 1.4;
    opacity: 0.8;
  }

</style>