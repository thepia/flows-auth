<!--
  SignInCore - Core sign-in logic without container styling
  Orchestrates EmailInput, AuthButton, and AuthStateMessage
  Handles auth state machine integration
-->
<script lang="ts">
import { createEventDispatcher, onMount } from 'svelte';
import type { SvelteAuthStore } from '../../types/svelte';
import type { AuthError, AuthMethod, User } from '../../types';
import { getAuthStoreFromContext } from '../../utils/auth-context';
import { m } from '../../utils/i18n';

import AuthButton from './AuthButton.svelte';
import AuthExplainer from './AuthExplainer.svelte';
import AuthStateMessage from './AuthStateMessage.svelte';
import EmailInput from './EmailInput.svelte';
import CodeInput from './CodeInput.svelte';
import AuthNewUserInfo from './AuthNewUserInfo.svelte';
import UserManagement from '../UserManagement.svelte';
import PinEntryStep from './PinEntryStep.svelte';
import PolicyViewer from './PolicyViewer.svelte';

// Props
export let store: SvelteAuthStore | null = null; // Auth store prop (preferred)
export let initialEmail = '';
export let className = '';
export let explainFeatures = false; // Whether to show features list in explainer

// NOTE: Legacy 'texts' prop has been removed. Use i18n translations instead.

// Auth store - use prop or fallback to context
// If store prop is provided, use it. Otherwise get from context (throws if missing).
const authStore = store || getAuthStoreFromContext();

$: authConfig = authStore?.getConfig?.();

// Events
const dispatch = createEventDispatcher<{
  success: { user: User|null; method: AuthMethod };
  error: { error: AuthError };
  navigate: { section: 'passkeys' | 'profile' | 'privacy' | 'terms' };
}>();

// Debug logging to see what's happening
$: console.log('🔍 SignInCore: authStore =', !!authStore, authStore);

// Component state (minimal - most state now in store)
let email = initialEmail;
// emailCode is now in the store, not local state

// PolicyViewer state
let showPolicyModal = false;

// Get current state from store reactively
let currentSignInState = 'emailEntry';
$: if (authStore) {
  currentSignInState = $authStore.signInState;
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
        authStore.setEmail('');
      }
      await authStore.checkUser(emailValue.trim());

    } catch (err) {
      console.error('check-user error:', err);
      // Error handling is now managed by AuthStore
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
    passkeysEnabled: $authStore.passkeysEnabled,
    enablePasskeys: authConfig.enablePasskeys,
    enableMagicLinks: authConfig.enableMagicLinks,
    signInMode: authConfig.signInMode,
  });

  // If initial email is provided, check for existing pins and trigger conditional auth
  if (initialEmail) {
    authStore.setEmail(initialEmail);

    // Check for existing valid pins if app code is configured
    try {
      await authStore.checkUser(initialEmail);

      // Don't auto-advance to pin input on mount - let user choose their authentication method
      // The pin status message and smart button configuration will show appropriate options
    } catch (error) {
      authStore.setLoading(false);
      console.warn('Error checking for existing pins on mount:', error);
    }
    
    // Also trigger conditional auth if passkeys are enabled
    if ($authStore.passkeysEnabled) {
      await startConditionalAuthentication();
    }
  }
}

// Initialize on mount
onMount(() => {
  initializeComponent();

  // Expose showPolicyPopup globally for onclick handlers in HTML
  if (typeof window !== 'undefined') {
    (window as any).showPolicyPopup = () => {
      showPolicyModal = true;
    };
  }

  // Cleanup on unmount
  return () => {
    if (typeof window !== 'undefined') {
      delete (window as any).showPolicyPopup;
    }
  };
});

// Handle email changes and conditional auth
async function handleEmailChange(event: CustomEvent<{value: string}>) {
  if (!store) return;

  // Update local email variable to ensure reactive statement triggers
  email = event.detail.value;
  // Error clearing is now handled by AuthStore

  console.log('📝 Email changed:', {
    newEmail: event.detail.value,
    emailLength: event.detail.value.length,
    emailTrim: event.detail.value.trim(),
    emailTrimLength: event.detail.value.trim().length,
    buttonShouldBeEnabled: !$authStore.loading && !!event.detail.value.trim()
  });
}

async function handleConditionalAuth(event: CustomEvent<{email: string}>) {
  if ($authStore.conditionalAuthActive || $authStore.loading) return;

  try {
    authStore.setConditionalAuthActive(true);
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
    authStore.setConditionalAuthActive(false);
  }
}

async function startConditionalAuthentication() {
  if ($authStore.conditionalAuthActive || !email.trim()) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return;

  await handleConditionalAuth(new CustomEvent('conditionalAuth', {
    detail: { email }
  }));
}


// Handle secondary action (pin fallback when passkey is primary)
async function handleSecondaryAction() {
  if (!email.trim() || !buttonConfig || !buttonConfig.secondary) return;

  authStore.setLoading(true);

  try {
    const secondaryMethod = buttonConfig.secondary.method;

    if (secondaryMethod === 'email-code') {
      // Check if user has a valid pin first
      if ($authStore.hasValidPin) {
        // Skip sending new code, go directly to verification step
        console.log('🔢 Secondary action: Valid pin detected, going to verification step');
        authStore.setLoading(false);
        authStore.notifyPinSent();
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
    authStore.setLoading(false);
    console.error('Secondary authentication error:', err);
    // Error handling is now managed by AuthStore
  }
}

// Handle primary sign in action
async function handleSignIn() {
  if (!email.trim()) return;

  authStore.setLoading(true);

  try {
    // Check what auth methods are available for this email (the user check is a bit redundant here)
    const userCheck = await authStore.checkUser(email);

    // Handle non-existing users based on config
    if (!userCheck.exists) {
      if (authConfig?.signInMode === 'login-only') {
        // Error will be shown via AuthStore apiError
        authStore.setLoading(false);
        return;
      } else if ($authStore.fullName && $authStore.fullName.trim()) {
        // User has entered Full Name, create account
        const [firstName, ...rest] = $authStore.fullName.trim().split(' ');
        const lastName = rest.join(' ');

        console.log('🔄 Creating account:', { email, firstName, lastName });
        try {
          await authStore.createAccount({
            email: email.trim(),
            firstName,
            lastName,
            acceptedTerms: false,
            acceptedPrivacy: false,
            invitationToken: authConfig.invitationToken
          });
          await handleEmailCodeAuth();
          authStore.setLoading(false);
        } catch (registrationError: any) {
          console.error('❌ Account creation failed:', registrationError);
          // Error handling is now managed by AuthStore
          authStore.setLoading(false);
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
        if ($authStore.hasValidPin) {
          // Skip sending new code, go directly to verification step
          console.log('🔢 Valid pin detected, skipping email send and going to verification step');
          authStore.setLoading(false);
          authStore.notifyPinSent();
        } else {
          await handleEmailCodeAuth();
        }
        break;

      case 'email-only':
        await handleMagicLinkAuth();
        break;

      default:
        // Error will be shown via AuthStore apiError
        authStore.setLoading(false);
    }

  } catch (err: any) {
    authStore.setLoading(false);
    console.error('Authentication error:', err);
    // Error handling is now managed by AuthStore
  }
}

// Determine the best authentication method based on config and user state
function determineAuthMethod(userCheck: any): 'passkey-only' | 'passkey-with-fallback' | 'email-code' | 'email-only' | 'none' {
  const hasPasskeys = userCheck.hasWebAuthn;

  // If user has passkeys and we support them
  if (hasPasskeys && $authStore.passkeysEnabled) {
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
    const result = await authStore.signInWithPasskey(email);

    authStore.setLoading(false);
    if (result.step === 'success' && result.user) {
      dispatch('success', {
        user: result.user,
        method: 'passkey',
      });
    }
  } catch (err: any) {
    // Error handling is now managed by AuthStore
    throw err;
  }
}

// Handle magic link authentication
async function handleMagicLinkAuth() {
  try {
    const result = await authStore.signInWithMagicLink(email);

      authStore.setLoading(false);
    if (result.step === 'magic-link' || result.magicLinkSent) {
      // setLocalStep('magicLinkSent');
    }
  } catch (err: any) {
    // Error handling is now managed by AuthStore
    throw err;
  }
}

// Handle email code authentication (transparently uses app endpoints if configured)
async function handleEmailCodeAuth() {
  try {
    const result = await authStore.sendEmailCode(email);

    authStore.setLoading(false);
    if (result.success) {
      // Notify auth store that PIN was sent to drive state transition
      authStore.notifyPinSent();
    } else {
      throw new Error(result.message || 'Failed to send email code');
    }
  } catch (err: any) {
    // Error handling is now managed by AuthStore
    throw err;
  }
}

// Email code verification now handled in PinEntryStep component

// Determine authentication method and button configuration (with null guards)
// Only depend on specific fields that affect button config, not the entire store
$: buttonConfig = (() => {
  // List dependencies explicitly to avoid reading the entire store
  const deps = [
    $authStore?.signInState,
    $authStore?.loading,
    $authStore?.email,
    $authStore?.emailCode,
    $authStore?.fullName,
    $authStore?.userExists,
    $authStore?.hasPasskeys
  ];
  return authStore?.getButtonConfig?.() ?? null;
})();

// State message configuration (centralized in AuthStore)
// CRITICAL: Depend on $authStore to trigger recalculation when ANY store state changes
$: stateMessage = $authStore ? authStore.getStateMessageConfig?.() ?? null : null;

// Explainer configuration (centralized in AuthStore)
$: explainerConfig = authStore?.getExplainerConfig?.(explainFeatures) ?? null;

// Reactive statement to check for existing pins when email changes (handles autocomplete)
$: if (authStore && email && (currentSignInState === 'emailEntry' || currentSignInState === 'userChecked')) {
  checkUserForEmail(email);
}
</script>

{#if authStore}
<div class="sign-in-core {className}">
  {#if currentSignInState === 'emailEntry' || currentSignInState === 'userChecked'}
    <!-- Combined Auth Step - Email entry with intelligent routing -->
    <form on:submit|preventDefault={handleSignIn}>
      <EmailInput
        value={email}
        label="email.label"
        placeholder="email.placeholder"
        disabled={$authStore.loading}
        enableWebAuthn={$authStore.passkeysEnabled}
        on:change={handleEmailChange}
        on:conditionalAuth={handleConditionalAuth}
      />
      
      {#if $authStore.hasValidPin && $authStore.pinRemainingMinutes > 0}
        <AuthStateMessage
          type="info"
          variant="pin-status"
        >
          {m["status.pinValid"]({
            minutes: $authStore.pinRemainingMinutes,
            s: $authStore.pinRemainingMinutes !== 1 ? 's' : ''
          })}
          <button
            type="button"
            class="pin-direct-link"
            on:click={() => authStore.notifyPinSent()}
            disabled={$authStore.loading}
          >
            {m["status.pinDirectAction"]()}
          </button>
        </AuthStateMessage>
      {/if}

      {#if currentSignInState === 'userChecked' && $authStore.userExists === false}
        {#if stateMessage}
          <AuthStateMessage
            type={stateMessage.type}
            tKey={stateMessage.textKey}
            showIcon={stateMessage.showIcon}
          />
        {/if}
        {#if authConfig?.signInMode !== 'login-only'}
          <!-- Registration form for new users -->
          <AuthNewUserInfo
            fullName={$authStore.fullName}
            disabled={$authStore.loading}
            error={null}
            on:input={(e) => authStore.setFullName(e.detail.fullName)}
          />
        {/if}
      {/if}
      
      {#if buttonConfig}
        <div class="button-section">
          <AuthButton
            type="submit"
            buttonConfig={buttonConfig.primary}
            loading={$authStore.loading}
            on:click={handleSignIn}
          />

          {#if buttonConfig.secondary}
            <AuthButton
              type="button"
              variant="secondary"
              buttonConfig={buttonConfig.secondary}
              loading={$authStore.loading}
              on:click={handleSecondaryAction}
            />
          {/if}
        </div>
      {/if}

      <!-- Auth explainer component -->
      <AuthExplainer config={explainerConfig} apiError={$authStore.apiError} />
    </form>

  {:else if currentSignInState === 'pinEntry'}
    <PinEntryStep {authStore} on:success />

  {:else if currentSignInState === 'signedIn'}
    {#if $authStore.user}
      <UserManagement
        user={$authStore.user}
        onSignOut={() => authStore.signOut()}
        onRefreshTokens={() => authStore.refreshTokens()}
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
    {#if stateMessage}
      <AuthStateMessage
        type={stateMessage.type}
        tKey={stateMessage.textKey}
        showIcon={stateMessage.showIcon}
      />
    {/if}
  {/if}
</div>

<!-- PolicyViewer Modal - Opened by global showPolicyPopup() function -->
<PolicyViewer
  open={showPolicyModal}
  store={authStore}
  on:close={() => showPolicyModal = false}
  on:consent={(e) => console.log('Policy consent:', e.detail)}
/>
{/if}

<style>
  .sign-in-core {
    width: 100%;
  }

  .button-section {
    margin-top: 16px;
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

  /* Global styling hook for WebAuthn indicator */
  :global(.webauthn-indicator) {
    text-align: center;
    margin-top: 16px;
  }
</style>