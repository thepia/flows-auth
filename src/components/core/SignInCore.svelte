<!--
  SignInCore - Core sign-in logic without container styling
  Orchestrates EmailInput, AuthButton, and AuthStateMessage
  Handles auth state machine integration
-->
<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import type { createAuthStore } from '../../stores/auth-store';
import { AUTH_CONTEXT_KEY } from '../../constants/context-keys';
import type { AuthError, AuthMethod, User, SignInEvent } from '../../types';
import { m } from '../../utils/i18n';

import AuthButton from './AuthButton.svelte';
import AuthExplainer from './AuthExplainer.svelte';
import AuthStateMessage from './AuthStateMessage.svelte';
import EmailInput from './EmailInput.svelte';
import CodeInput from './CodeInput.svelte';
import AuthNewUserInfo from './AuthNewUserInfo.svelte';
import UserManagement from '../UserManagement.svelte';

// Props - only presentational props, no auth logic props
export let initialEmail = '';
export let className = '';
export let explainFeatures = false; // Whether to show features list in explainer

// NOTE: Legacy 'texts' prop has been removed. Use i18n translations instead.

// Get config from auth store context only
$: authConfig = store?.getConfig();

// Events
const dispatch = createEventDispatcher<{
  success: { user: User; method: AuthMethod };
  error: { error: AuthError };
  navigate: { section: 'passkeys' | 'profile' | 'privacy' | 'terms' };
}>();

// Get auth store from context using reactive pattern  
const authStoreContext = getContext<any>(AUTH_CONTEXT_KEY);

// Use reactive $store syntax - automatically subscribes and updates
$: store = $authStoreContext as ReturnType<typeof createAuthStore>;

// Debug logging to see what's happening
$: console.log('🔍 SignInCore: store =', !!store, store);

// Component state (minimal - most state now in store)
let email = initialEmail;
let emailCode = '';
let error: string | null = null;

// Get current state from store reactively
$: currentSignInState = store ? $store.signInState : 'emailEntry';

// Helper to send SignInEvents to the auth store
function sendSignInEvent(event: SignInEvent) {
  if (store) {
    return store.sendSignInEvent(event);
  }
  return 'emailEntry';
}

// Debounced function to check email for existing pins (reactive statement compatible)
let emailCheckTimeout: ReturnType<typeof setTimeout> | undefined;
async function checkUserForEmail(emailValue: string) {
  // Clear any existing timeout to debounce rapid changes
  if (emailCheckTimeout) {
    clearTimeout(emailCheckTimeout);
  }

  emailCheckTimeout = setTimeout(async () => {
    try {
      console.log('🔍 Reactive email pin check for:', emailValue.trim());
      if (!email || !email.trim()) {
        store.setEmail('');
      }
      await store.checkUser(emailValue.trim());

    } catch (error) {
      console.warn('Error in reactive email pin check:', error);
    }
  }, 400); // 400ms debounce to avoid too many API calls while typing
}

// Initialize component logic
async function initializeComponent() {
  // Only initialize if we have store and config
  if (!store || !authConfig) {
    console.log('🔍 SignInCore: Waiting for store and config to be available');
    return;
  }

  console.log('🔐 SignInCore Authentication Methods:', {
    passkeysEnabled: $store.passkeysEnabled,
    enablePasskeys: authConfig.enablePasskeys,
    enableMagicLinks: authConfig.enableMagicLinks,
    signInMode: authConfig.signInMode,
  });

  // If initial email is provided, check for existing pins and trigger conditional auth
  if (initialEmail) {
    store.setEmail(initialEmail);

    // Check for existing valid pins if app code is configured
    try {
      await store.checkUser(initialEmail);

      // Don't auto-advance to pin input on mount - let user choose their authentication method
      // The pin status message and smart button configuration will show appropriate options
    } catch (error) {
      store.setLoading(false);
      console.warn('Error checking for existing pins on mount:', error);
    }
    
    // Also trigger conditional auth if passkeys are enabled
    if ($store.passkeysEnabled) {
      await startConditionalAuthentication();
    }
  }
}

// Initialize on mount
onMount(initializeComponent);

// Handle email changes and conditional auth
async function handleEmailChange(event: CustomEvent<{value: string}>) {
  if (!store) return;

  // Update local email variable to ensure reactive statement triggers
  email = event.detail.value;
  error = null; // Clear errors when user types

  console.log('📝 Email changed:', {
    newEmail: event.detail.value,
    emailLength: event.detail.value.length,
    emailTrim: event.detail.value.trim(),
    emailTrimLength: event.detail.value.trim().length,
    buttonShouldBeEnabled: !$store.loading && !!event.detail.value.trim()
  });
}

async function handleConditionalAuth(event: CustomEvent<{email: string}>) {
  if ($store.conditionalAuthActive || $store.loading) return;

  try {
    store.setConditionalAuthActive(true);
    console.log('🔍 Starting conditional authentication for:', event.detail.email);

    const success = await store.startConditionalAuthentication(event.detail.email);
    if (success) {
      console.log('✅ Conditional authentication successful');
      dispatch('success', {
        user: $store.user,
        method: 'passkey',
      });
    }
  } catch (error) {
    // Conditional auth should fail silently - expected if no passkeys exist
    console.log('⚠️ Conditional authentication failed (expected if no passkeys):', error);
  } finally {
    store.setConditionalAuthActive(false);
  }
}

async function startConditionalAuthentication() {
  if ($store.conditionalAuthActive || !email.trim()) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return;

  await handleConditionalAuth(new CustomEvent('conditionalAuth', {
    detail: { email }
  }));
}

// Direct action to go to pin input when pin status message is clicked
function goToPinInput() {
  if (!$store.hasValidPin || !email.trim()) {
    return;
  }

  // We should already be in userChecked state from reactive email checking
  // Just send SENT_PIN_EMAIL to transition to pinEntry
  store.setEmailCodeSent(true); // Mark as sent since we have a valid pin
  sendSignInEvent({ type: 'SENT_PIN_EMAIL' });
}

// Handle secondary action (pin fallback when passkey is primary)
async function handleSecondaryAction() {
  if (!email.trim() || !buttonConfig || !buttonConfig.secondary) return;

  store.setLoading(true);
  error = null;

  try {
    const secondaryMethod = buttonConfig.secondary.method;

    if (secondaryMethod === 'email-code') {
      // Check if user has a valid pin first
      if ($store.hasValidPin) {
        // Skip sending new code, go directly to verification step
        console.log('🔢 Secondary action: Valid pin detected, going to verification step');
        store.setEmailCodeSent(true);
        store.setLoading(false);
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
    store.setLoading(false);
    error = getUserFriendlyErrorMessage(err);
    console.error('Secondary authentication error:', err);
  }
}

// Handle primary sign in action
async function handleSignIn() {
  if (!email.trim()) return;

  store.setLoading(true);
  error = null;

  try {
    // Check what auth methods are available for this email (the user check is a bit redundant here)
    const userCheck = await store.checkUser(email);

    // Handle non-existing users based on config
    if (!userCheck.exists) {
      if (authConfig?.signInMode === 'login-only') {
        error = 'No account found for this email address. Please check your email or create an account.';
        store.setLoading(false);
        return;
      } else if ($store.fullName && $store.fullName.trim()) {
        // User has entered Full Name, create account
        const [firstName, ...rest] = $store.fullName.trim().split(' ');
        const lastName = rest.join(' ');

        console.log('🔄 Creating account:', { email, firstName, lastName });
        try {
          await store.createAccount({
            email: email.trim(),
            firstName,
            lastName,
            acceptedTerms: false,
            acceptedPrivacy: false,
            invitationToken: authConfig.invitationToken
          });
          await handleEmailCodeAuth();
          store.setLoading(false);
        } catch (registrationError: any) {
          console.error('❌ Account creation failed:', registrationError);
          error = registrationError.message || 'Failed to create account. Please try again.';
          store.setLoading(false);
        }
        return;
      }
    }

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
          await handleEmailCodeAuth();
        }
        break;
      
      case 'email-code':
        // Check if user has a valid pin first
        if ($store.hasValidPin) {
          // Skip sending new code, go directly to verification step
          console.log('🔢 Valid pin detected, skipping email send and going to verification step');
          store.setEmailCodeSent(true);
          store.setLoading(false);
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
        store.setLoading(false);
    }

  } catch (err: any) {
    store.setLoading(false);
    error = getUserFriendlyErrorMessage(err);
    console.error('Authentication error:', err);
  }
}

// Determine the best authentication method based on config and user state
function determineAuthMethod(userCheck: any): 'passkey-only' | 'passkey-with-fallback' | 'email-code' | 'email-only' | 'none' {
  const hasPasskeys = userCheck.hasWebAuthn;

  // If user has passkeys and we support them
  if (hasPasskeys && $store.passkeysEnabled) {
    // Use passkey with fallback to email if other email methods are enabled
    const hasEmailFallback = authConfig.appCode || authConfig.enableMagicLinks;
    return hasEmailFallback ? 'passkey-with-fallback' : 'passkey-only';
  }

  // If app-based email authentication is available
  if (authConfig.appCode) {
    return 'email-code';
  }

  // If user doesn't have passkeys but we have magic links enabled
  if (authConfig.enableMagicLinks) {
    return 'email-only';
  }

  // No authentication methods available
  return 'none';
}

// Handle passkey authentication
async function handlePasskeyAuth() {
  try {
    const result = await store.signInWithPasskey(email);

    store.setLoading(false);
    if (result.step === 'success' && result.user) {
      dispatch('success', {
        user: result.user,
        method: 'passkey',
      });
    }
  } catch (err: any) {
    error = getUserFriendlyErrorMessage(err);
    throw err;
  }
}

// Handle magic link authentication
async function handleMagicLinkAuth() {
  try {
    const result = await store.signInWithMagicLink(email);

      store.setLoading(false);
    if (result.step === 'magic-link' || result.magicLinkSent) {
      // setLocalStep('magicLinkSent');
    }
  } catch (err: any) {
    error = err.message || 'Failed to send magic link';
    throw err;
  }
}

// Handle email code authentication (transparently uses app endpoints if configured)
async function handleEmailCodeAuth() {
  try {
    const result = await store.sendEmailCode(email);

    store.setLoading(false);
    if (result.success) {
      // Notify auth store that PIN was sent to drive state transition
      store.notifyPinSent();

      store.setEmailCodeSent(true);
    } else {
      throw new Error(result.message || 'Failed to send email code');
    }
  } catch (err: any) {
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

  store.setLoading(true);
  error = null;

  try {
    const result = await store.verifyEmailCode(emailCode);

    store.setLoading(false);
    if (result.step === 'success' && result.user) {
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
      store.notifyPinVerified(sessionData);

      // Send event to clear pin state after successful verification
      sendSignInEvent({ type: 'PIN_VERIFIED', session: sessionData });

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
  error = null;
  // All state is now managed in the store and will be reset by the RESET event
}

// Determine authentication method and button configuration (with null guards)
$: buttonConfig = store && $store ? store.getButtonConfig() : null;

// State message configuration (centralized in AuthStore)
$: stateMessageConfig = store && $store ? store.getStateMessageConfig() : null;

// Explainer configuration (centralized in AuthStore)
$: explainerConfig = store ? store.getExplainerConfig(explainFeatures) : null;

// Reactive statement to check for existing pins when email changes (handles autocomplete)
$: if (store && email && (currentSignInState === 'emailEntry' || currentSignInState === 'userChecked')) {
  checkUserForEmail(email);
}
</script>

{#if store && authConfig}
<div class="sign-in-core {className}">
  {#if currentSignInState === 'emailEntry' || currentSignInState === 'userChecked'}
    <!-- Combined Auth Step - Email entry with intelligent routing -->
    <form on:submit|preventDefault={handleSignIn}>
      <EmailInput
        value={email}
        label="email.label"
        placeholder="email.placeholder"
        {error}
        disabled={$store.loading}
        enableWebAuthn={$store.passkeysEnabled}
        on:change={handleEmailChange}
        on:conditionalAuth={handleConditionalAuth}
      />
      
      {#if $store.hasValidPin && $store.pinRemainingMinutes > 0}
        <div class="pin-status-message">
          <span class="pin-status-icon">📧</span>
          <span class="pin-status-text">
            {m["status.pinValid"]({
              minutes: $store.pinRemainingMinutes,
              s: $store.pinRemainingMinutes !== 1 ? 's' : ''
            })}
            <button
              type="button"
              class="pin-direct-link"
              on:click={goToPinInput}
              disabled={$store.loading}
            >
              {m["status.pinDirectAction"]()}
            </button>
          </span>
        </div>
      {/if}

      {#if currentSignInState === 'userChecked' && $store.userExists === false}
        {#if stateMessageConfig}
          <AuthStateMessage
            type={stateMessageConfig.type}
            tKey={stateMessageConfig.textKey}
            showIcon={stateMessageConfig.showIcon}
          />
        {/if}
        {#if authConfig?.signInMode !== 'login-only'}
          <!-- Registration form for new users -->
          <AuthNewUserInfo
            fullName={$store.fullName}
            disabled={$store.loading}
            error={null}
            on:input={(e) => store.setFullName(e.detail.fullName)}
          />
        {/if}
      {/if}
      
      {#if buttonConfig}
        <div class="button-section">
          <AuthButton
            type="submit"
            buttonConfig={buttonConfig.primary}
            loading={$store.loading}
            on:click={handleSignIn}
          />

          {#if buttonConfig.secondary}
            <AuthButton
              type="button"
              variant="secondary"
              buttonConfig={buttonConfig.secondary}
              loading={$store.loading}
              on:click={handleSecondaryAction}
            />
          {/if}
        </div>
      {/if}

      <!-- Auth explainer component -->
      <AuthExplainer config={explainerConfig} />
    </form>

  {:else if currentSignInState === 'pinEntry'}
    <!-- Email Code Input Step -->
    <div class="email-code-input">
      <form on:submit|preventDefault={handleEmailCodeVerification}>
        <CodeInput
          bind:value={emailCode}
          label="code.label"
          placeholder="code.placeholder"
          {error}
          disabled={$store.loading}
          maxlength={6}
        />

      {#if stateMessageConfig}
        <AuthStateMessage
          type={stateMessageConfig.type}
          tKey={stateMessageConfig.textKey}
          showIcon={stateMessageConfig.showIcon}
        />

        {#if $store.emailCodeSent && !$store.hasValidPin}
          <p class="email-code-message">
            {m["status.emailSent"]()}<br>
            <strong>{email}</strong>
          </p>
        {:else}
          <p class="email-code-message">
            Enter the verification code from your recent email<br>
            <strong>{email}</strong>
          </p>
        {/if}
      {/if}


        {#if buttonConfig}
          <div class="button-section">
            <AuthButton
              type="submit"
              buttonConfig={buttonConfig.primary}
              loading={$store.loading}
              on:click={handleEmailCodeVerification}
            />

            {#if buttonConfig.secondary}
              <AuthButton
                type="button"
                variant="secondary"
                buttonConfig={buttonConfig.secondary}
                loading={$store.loading}
                on:click={resetForm}
              />
            {/if}
          </div>
        {/if}
      </form>
    </div>

  {:else if currentSignInState === 'signedIn'}
    {#if $store.user}
      <UserManagement
        user={$store.user}
        onSignOut={() => store.signOut()}
        on:navigate
      />
    {/if}

  {:else if currentSignInState === 'registrationTerms'}
    <!-- Registration flow would be handled by parent or separate component -->
    <AuthStateMessage
      type="info"
      tKey="registration.required"
      showIcon={true}
    />
  {:else if currentSignInState === 'emailVerification'}
    <!-- Email verification required -->
    {#if stateMessageConfig}
      <AuthStateMessage
        type={stateMessageConfig.type}
        tKey={stateMessageConfig.textKey}
        showIcon={stateMessageConfig.showIcon}
      />
    {/if}
  {/if}
</div>
{:else}
  <div class="loading-state">
    <p>
      {#if !store}
        Waiting for authentication context...
      {:else if !authConfig}
        Loading configuration...
      {:else}
        Initializing authentication...
      {/if}
    </p>
  </div>
{/if}

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
  




</style>